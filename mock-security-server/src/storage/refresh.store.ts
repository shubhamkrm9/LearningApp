import crypto from 'crypto';

export interface RefreshTokenMetadata {
  tokenHash: string; // We no longer store the plaintext token
  sessionId: string;
  deviceId: string;  // Added for Device Mismatch detection
  issued: number;
  expires: number;
  rotationCount: number;
  lastUsed: number;
  status: 'ACTIVE' | 'USED' | 'REVOKED';
}

class RefreshStore {
  private db = new Map<string, RefreshTokenMetadata>();

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public saveToken(plaintextToken: string, metadata: Omit<RefreshTokenMetadata, 'tokenHash'>): void {
    const tokenHash = this.hashToken(plaintextToken);
    this.db.set(tokenHash, { ...metadata, tokenHash });
  }

  public getToken(plaintextToken: string): RefreshTokenMetadata | undefined {
    const tokenHash = this.hashToken(plaintextToken);
    return this.db.get(tokenHash);
  }

  public revokeAllForSession(sessionId: string): void {
    for (const [hash, meta] of this.db.entries()) {
      if (meta.sessionId === sessionId) {
        meta.status = 'REVOKED';
        this.db.set(hash, meta);
      }
    }
  }
}

export const refreshStore = new RefreshStore();
