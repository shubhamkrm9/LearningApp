/**
 * Biometric Authentication Type Definitions
 * 
 * Used across BiometricAuthService, LoginScreen, and SessionManager.
 */

// ─── Native Module Response Types ────────────────────────────────────────────

export interface BiometricAvailabilityInfo {
  available: boolean;
  biometricType: 'FINGERPRINT' | 'FACE' | 'IRIS' | 'MULTIPLE' | 'NONE';
  /** STRONG = Class 3 biometric (hardware-backed), WEAK = Class 2, NONE = unavailable */
  securityLevel: 'STRONG' | 'WEAK' | 'NONE';
  /** Whether the device also supports PIN/pattern/password as fallback */
  hasDeviceCredential: boolean;
}

export interface KeyPairResult {
  /** Base64-encoded DER public key */
  publicKey: string;
  /** SHA-256 hash of the public key for quick lookups */
  publicKeyHash: string;
  /** Whether the key is StrongBox-backed (dedicated HSM) or TEE-backed */
  isStrongBoxBacked: boolean;
}

export interface SignatureResult {
  /** Base64-encoded ECDSA signature */
  signature: string;
  /** SHA-256 hash of the public key that signed this */
  publicKeyHash: string;
}

// ─── Enrollment Status ───────────────────────────────────────────────────────

export interface BiometricEnrollmentStatus {
  /** Whether biometric is enrolled on this device for this app */
  enrolled: boolean;
  /** The userId the biometric is bound to */
  userId: string | null;
  /** When the enrollment was created */
  enrolledAt: number | null;
  /** Whether the TEE key pair exists in Android Keystore */
  keyPairExists: boolean;
  /** Whether the server has the public key registered */
  serverEnrolled: boolean;
}

// ─── Server API Types ────────────────────────────────────────────────────────

export interface BiometricChallengeResponse {
  challenge: string;
  expiresIn: number;
}

export interface BiometricVerifyResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface BiometricEnrollResponse {
  enrolled: boolean;
  userId: string;
}

export interface BiometricStatusResponse {
  enrolled: boolean;
  userId: string | null;
  enrolledAt: number | null;
  locked: boolean;
}

// ─── Failure Tracking ────────────────────────────────────────────────────────

export interface BiometricFailureState {
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lockedUntil: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const BIOMETRIC_KEYCHAIN_SERVICE = 'com.learningapp.biometric.enrollment';
export const MAX_LOCAL_FAILURES = 5;
export const LOCAL_LOCKOUT_BASE_MS = 30000; // 30 seconds
