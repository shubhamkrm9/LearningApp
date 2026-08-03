import crypto from 'crypto';

// ─── Enrolled Biometric Credential ───────────────────────────────────────────

export interface BiometricCredential {
  userId: string;
  deviceId: string;
  publicKey: string;       // PEM-encoded public key
  enrolledAt: number;
  lastUsedAt: number;
  failureCount: number;
  lockedUntil: number | null;
}

// ─── Active Challenge (Nonce) ────────────────────────────────────────────────

export interface BiometricChallenge {
  challenge: string;       // Base64-encoded random bytes
  deviceId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// ─── Biometric Credential Store ──────────────────────────────────────────────

class BiometricStore {
  // Key: deviceId → credential (supports multi-device per user)
  private credentials = new Map<string, BiometricCredential>();
  // Key: challenge string → challenge metadata
  private challenges = new Map<string, BiometricChallenge>();

  // ─── Enrollment ──────────────────────────────────────────────────────────

  public enrollCredential(
    userId: string,
    deviceId: string,
    publicKey: string
  ): BiometricCredential {
    const credential: BiometricCredential = {
      userId,
      deviceId,
      publicKey,
      enrolledAt: Date.now(),
      lastUsedAt: Date.now(),
      failureCount: 0,
      lockedUntil: null,
    };
    this.credentials.set(deviceId, credential);
    return credential;
  }

  public getCredentialByDevice(deviceId: string): BiometricCredential | undefined {
    return this.credentials.get(deviceId);
  }

  public getCredentialsByUser(userId: string): BiometricCredential[] {
    const results: BiometricCredential[] = [];
    for (const cred of this.credentials.values()) {
      if (cred.userId === userId) {
        results.push(cred);
      }
    }
    return results;
  }

  public removeCredential(deviceId: string): boolean {
    return this.credentials.delete(deviceId);
  }

  public removeAllForUser(userId: string): void {
    for (const [deviceId, cred] of this.credentials.entries()) {
      if (cred.userId === userId) {
        this.credentials.delete(deviceId);
      }
    }
  }

  public updateLastUsed(deviceId: string): void {
    const cred = this.credentials.get(deviceId);
    if (cred) {
      cred.lastUsedAt = Date.now();
      cred.failureCount = 0;        // Reset on success
      cred.lockedUntil = null;
      this.credentials.set(deviceId, cred);
    }
  }

  public incrementFailure(deviceId: string, maxFailures: number, lockoutDurationMs: number): number {
    const cred = this.credentials.get(deviceId);
    if (!cred) return 0;

    cred.failureCount += 1;

    if (cred.failureCount >= maxFailures) {
      // Exponential backoff: 30s, 1m, 5m, 15m based on how many times we've hit the limit
      const multiplier = Math.pow(2, Math.floor(cred.failureCount / maxFailures) - 1);
      cred.lockedUntil = Date.now() + (lockoutDurationMs * multiplier);
    }

    this.credentials.set(deviceId, cred);
    return cred.failureCount;
  }

  public isLocked(deviceId: string): boolean {
    const cred = this.credentials.get(deviceId);
    if (!cred || !cred.lockedUntil) return false;
    if (Date.now() >= cred.lockedUntil) {
      // Lockout expired
      cred.lockedUntil = null;
      this.credentials.set(deviceId, cred);
      return false;
    }
    return true;
  }

  // ─── Challenge Management ────────────────────────────────────────────────

  public createChallenge(deviceId: string, ttlMs: number): BiometricChallenge {
    // Clean up expired challenges first
    this.cleanupExpiredChallenges();

    const challengeBytes = crypto.randomBytes(32);
    const challenge = challengeBytes.toString('base64');

    const entry: BiometricChallenge = {
      challenge,
      deviceId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      used: false,
    };

    this.challenges.set(challenge, entry);
    return entry;
  }

  public consumeChallenge(challenge: string, deviceId: string): BiometricChallenge | null {
    const entry = this.challenges.get(challenge);

    if (!entry) return null;
    if (entry.deviceId !== deviceId) return null;
    if (entry.used) return null;
    if (Date.now() > entry.expiresAt) {
      this.challenges.delete(challenge);
      return null;
    }

    // Mark as used (single-use enforcement)
    entry.used = true;
    this.challenges.set(challenge, entry);

    return entry;
  }

  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [key, entry] of this.challenges.entries()) {
      if (now > entry.expiresAt || entry.used) {
        this.challenges.delete(key);
      }
    }
  }
}

export const biometricStore = new BiometricStore();
