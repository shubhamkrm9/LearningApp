/**
 * BiometricAuthService
 * 
 * Orchestrates the full biometric authentication lifecycle:
 * 1. Enrollment — After password login, generate TEE key pair and register public key with server
 * 2. Authentication — Request challenge from server, sign with TEE key, verify on server
 * 3. Unenrollment — Remove TEE key pair and server credential
 * 
 * Security Model (FIDO2-inspired):
 * - Private keys never leave the Android TEE/StrongBox hardware
 * - Challenge-response prevents replay attacks (server nonce is single-use, 60s TTL)
 * - Biometric + PIN fallback (Android BiometricPrompt with DEVICE_CREDENTIAL)
 * - Key invalidated on biometric enrollment change (fingerprint added/removed)
 */

import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { api } from './apiInterceptor';
import TokenManager, { Tokens } from './TokenManager';
import SessionManager from './SessionManager';
import SecurityLogger from './SecurityLogger';
import {
  BiometricAvailabilityInfo,
  BiometricEnrollmentStatus,
  BiometricChallengeResponse,
  BiometricVerifyResponse,
  BiometricEnrollResponse,
  BiometricStatusResponse,
  BiometricFailureState,
  BIOMETRIC_KEYCHAIN_SERVICE,
  MAX_LOCAL_FAILURES,
  LOCAL_LOCKOUT_BASE_MS,
} from './biometric.types';

const { BiometricCrypto } = NativeModules;

class BiometricAuthService {
  private static instance: BiometricAuthService;
  private failureState: BiometricFailureState = {
    consecutiveFailures: 0,
    lastFailureAt: null,
    lockedUntil: null,
  };

  private constructor() {}

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  // ─── Availability Check ──────────────────────────────────────────────────

  /**
   * Checks if the device supports biometric authentication at the hardware level.
   * Returns detailed info about biometric type and security level.
   */
  public async isBiometricAvailable(): Promise<BiometricAvailabilityInfo> {
    try {
      const resultJson = await BiometricCrypto.isBiometricAvailable();
      return JSON.parse(resultJson) as BiometricAvailabilityInfo;
    } catch (error) {
      SecurityLogger.warn('[BiometricAuth] Failed to check biometric availability:', error);
      return {
        available: false,
        biometricType: 'NONE',
        securityLevel: 'NONE',
        hasDeviceCredential: false,
      };
    }
  }

  // ─── Enrollment Status ───────────────────────────────────────────────────

  /**
   * Checks whether biometric authentication is enrolled for the current device.
   * Verifies both the local TEE key pair AND server-side enrollment.
   */
  public async isEnrolled(): Promise<BiometricEnrollmentStatus> {
    try {
      // 1. Check local enrollment metadata in Keychain
      const localMeta = await Keychain.getGenericPassword({
        service: BIOMETRIC_KEYCHAIN_SERVICE,
      });

      if (!localMeta) {
        return {
          enrolled: false,
          userId: null,
          enrolledAt: null,
          keyPairExists: false,
          serverEnrolled: false,
        };
      }

      const metadata = JSON.parse(localMeta.password);

      // 2. Check if TEE key pair still exists (may be invalidated by biometric change)
      let keyPairExists = false;
      try {
        const existsJson = await BiometricCrypto.keyPairExists(metadata.userId);
        keyPairExists = JSON.parse(existsJson).exists === true;
      } catch {
        keyPairExists = false;
      }

      // 3. Check server-side enrollment
      let serverEnrolled = false;
      try {
        const deviceId = await TokenManager.getDeviceId();
        const response = await api.get(`/auth/biometric/status?deviceId=${deviceId}`);
        serverEnrolled = response.data.enrolled === true;
      } catch {
        // Server might be unreachable — use local state as fallback
        serverEnrolled = metadata.serverEnrolled ?? false;
      }

      // If key was invalidated (fingerprint changed), enrollment is stale
      if (!keyPairExists) {
        SecurityLogger.warn('[BiometricAuth] TEE key pair invalidated. Re-enrollment required.');
        await this.clearLocalEnrollment();
        return {
          enrolled: false,
          userId: metadata.userId,
          enrolledAt: null,
          keyPairExists: false,
          serverEnrolled,
        };
      }

      return {
        enrolled: keyPairExists && serverEnrolled,
        userId: metadata.userId,
        enrolledAt: metadata.enrolledAt,
        keyPairExists,
        serverEnrolled,
      };
    } catch (error) {
      SecurityLogger.error('[BiometricAuth] Enrollment check failed:', error);
      return {
        enrolled: false,
        userId: null,
        enrolledAt: null,
        keyPairExists: false,
        serverEnrolled: false,
      };
    }
  }

  // ─── Enrollment ──────────────────────────────────────────────────────────

  /**
   * Enrolls biometric authentication after a successful password login.
   * Generates a TEE-bound key pair and registers the public key with the server.
   * 
   * Prerequisites: User must have active tokens (just logged in with password).
   */
  public async enrollBiometric(): Promise<boolean> {
    try {
      const tokens = SessionManager.getActiveTokens();
      if (!tokens?.sessionId) {
        SecurityLogger.error('[BiometricAuth] Cannot enroll: No active session.');
        return false;
      }

      const deviceId = await TokenManager.getDeviceId();

      // 1. Determine the userId from the active session
      // We extract it from the token's context or use a default
      const userId = tokens.sessionId; // Using sessionId as user identifier for key alias

      // 2. Generate TEE key pair (private key never leaves hardware)
      SecurityLogger.info('[BiometricAuth] Generating TEE key pair...');
      const keyResultJson = await BiometricCrypto.generateKeyPair(userId);
      const keyResult = JSON.parse(keyResultJson);

      SecurityLogger.info(`[BiometricAuth] Key pair generated. StrongBox=${keyResult.isStrongBoxBacked}`);

      // 3. Register public key with server
      const response = await api.post<BiometricEnrollResponse>('/auth/biometric/enroll', {
        publicKey: keyResult.publicKey,
        deviceId,
        sessionId: tokens.sessionId,
      });

      if (!response.data.enrolled) {
        SecurityLogger.error('[BiometricAuth] Server rejected enrollment.');
        await BiometricCrypto.deleteKeyPair(userId);
        return false;
      }

      // 4. Store enrollment metadata locally (securely)
      await Keychain.setGenericPassword(
        'biometric_enrollment',
        JSON.stringify({
          userId,
          enrolledAt: Date.now(),
          publicKeyHash: keyResult.publicKeyHash,
          serverEnrolled: true,
          serverUserId: response.data.userId,
        }),
        { service: BIOMETRIC_KEYCHAIN_SERVICE }
      );

      SecurityLogger.info('[BiometricAuth] ✅ Biometric enrollment complete.');
      SecurityLogger.logEvent({
        eventType: 'BIOMETRIC_ENROLLED',
        deviceId,
        riskScore: 0,
        details: `StrongBox=${keyResult.isStrongBoxBacked}`,
      });

      return true;
    } catch (error: any) {
      SecurityLogger.error('[BiometricAuth] Enrollment failed:', error?.message || error);
      return false;
    }
  }

  // ─── Authentication ──────────────────────────────────────────────────────

  /**
   * Authenticates using biometric/PIN via FIDO2-style challenge-response.
   * 
   * Flow:
   * 1. Request challenge nonce from server
   * 2. Sign challenge with TEE private key (triggers BiometricPrompt)
   * 3. Send signed challenge to server for verification
   * 4. Receive new session tokens on success
   */
  public async authenticateWithBiometric(): Promise<Tokens | null> {
    // Check local lockout
    if (this.isLocallyLocked()) {
      SecurityLogger.warn('[BiometricAuth] Device is locally locked. Please wait.');
      return null;
    }

    try {
      const enrollment = await this.isEnrolled();
      if (!enrollment.enrolled || !enrollment.userId) {
        SecurityLogger.warn('[BiometricAuth] Not enrolled. Cannot authenticate with biometric.');
        return null;
      }

      const deviceId = await TokenManager.getDeviceId();

      // 1. Request challenge from server
      SecurityLogger.info('[BiometricAuth] Requesting challenge...');
      const challengeResponse = await api.post<BiometricChallengeResponse>(
        '/auth/biometric/challenge',
        { deviceId }
      );

      const { challenge } = challengeResponse.data;

      // 2. Sign challenge with TEE key (shows BiometricPrompt to user)
      SecurityLogger.info('[BiometricAuth] Signing challenge (biometric prompt will appear)...');
      const signResultJson = await BiometricCrypto.signChallenge(challenge, enrollment.userId);
      const signResult = JSON.parse(signResultJson);

      // 3. Submit signed challenge to server
      SecurityLogger.info('[BiometricAuth] Submitting signed challenge...');
      const verifyResponse = await api.post<BiometricVerifyResponse>(
        '/auth/biometric/verify',
        {
          deviceId,
          challenge,
          signature: signResult.signature,
        }
      );

      const tokens: Tokens = {
        accessToken: verifyResponse.data.accessToken,
        refreshToken: verifyResponse.data.refreshToken,
        sessionId: verifyResponse.data.sessionId,
      };

      // 4. Store tokens securely and activate session
      await TokenManager.setTokens(tokens);
      SessionManager.setSessionActive(tokens);

      // Reset failure state on success
      this.failureState = {
        consecutiveFailures: 0,
        lastFailureAt: null,
        lockedUntil: null,
      };

      SecurityLogger.info('[BiometricAuth] ✅ Biometric login successful.');
      SecurityLogger.logEvent({
        eventType: 'BIOMETRIC_LOGIN_SUCCESS',
        deviceId,
        riskScore: 0,
        details: 'Challenge-response verified',
      });

      return tokens;
    } catch (error: any) {
      this.handleAuthFailure(error);
      return null;
    }
  }

  // ─── Unenrollment ────────────────────────────────────────────────────────

  /**
   * Removes biometric enrollment from both device and server.
   * Called during logout or when RASP detects device compromise.
   */
  public async unenroll(): Promise<void> {
    try {
      const enrollment = await this.isEnrolled();

      // 1. Delete TEE key pair
      if (enrollment.userId) {
        try {
          await BiometricCrypto.deleteKeyPair(enrollment.userId);
        } catch {
          // Key might already be gone
        }
      }

      // 2. Notify server
      try {
        const deviceId = await TokenManager.getDeviceId();
        await api.post('/auth/biometric/unenroll', {
          deviceId,
          sessionId: SessionManager.getActiveTokens()?.sessionId || 'cleanup',
        });
      } catch {
        // Server might be unreachable — local cleanup is sufficient
      }

      // 3. Clear local enrollment metadata
      await this.clearLocalEnrollment();

      SecurityLogger.info('[BiometricAuth] Biometric enrollment removed.');
    } catch (error) {
      SecurityLogger.error('[BiometricAuth] Unenrollment error:', error);
      // Force-clear local state even on error
      await this.clearLocalEnrollment();
    }
  }

  // ─── Lockout Management ──────────────────────────────────────────────────

  private isLocallyLocked(): boolean {
    if (!this.failureState.lockedUntil) return false;
    if (Date.now() >= this.failureState.lockedUntil) {
      this.failureState.lockedUntil = null;
      return false;
    }
    return true;
  }

  public getLockedUntil(): number | null {
    return this.failureState.lockedUntil;
  }

  public getFailureCount(): number {
    return this.failureState.consecutiveFailures;
  }

  private handleAuthFailure(error: any): void {
    this.failureState.consecutiveFailures += 1;
    this.failureState.lastFailureAt = Date.now();

    // Apply exponential backoff lockout after MAX_LOCAL_FAILURES
    if (this.failureState.consecutiveFailures >= MAX_LOCAL_FAILURES) {
      const multiplier = Math.pow(2, Math.floor(this.failureState.consecutiveFailures / MAX_LOCAL_FAILURES) - 1);
      this.failureState.lockedUntil = Date.now() + (LOCAL_LOCKOUT_BASE_MS * multiplier);

      SecurityLogger.warn(
        `[BiometricAuth] Lockout activated. Failures=${this.failureState.consecutiveFailures}, ` +
        `locked for ${(LOCAL_LOCKOUT_BASE_MS * multiplier) / 1000}s`
      );
    }

    // Determine error type for logging
    const isUserCancellation = error?.message?.includes('cancel') ||
                                error?.message?.includes('Cancel') ||
                                error?.code === 'USER_CANCELED';

    if (isUserCancellation) {
      SecurityLogger.info('[BiometricAuth] User cancelled biometric prompt.');
    } else {
      SecurityLogger.error('[BiometricAuth] Authentication failed:', error?.message || error);
      SecurityLogger.logEvent({
        eventType: 'BIOMETRIC_FAILED',
        deviceId: 'unknown',
        riskScore: 20,
        details: `Failure #${this.failureState.consecutiveFailures}: ${error?.message || 'Unknown error'}`,
      });
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async clearLocalEnrollment(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: BIOMETRIC_KEYCHAIN_SERVICE });
    } catch {
      // Ignore errors during cleanup
    }
  }
}

export default BiometricAuthService.getInstance();
