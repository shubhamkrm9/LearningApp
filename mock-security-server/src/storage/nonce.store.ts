import { SecurityConfig } from '../config/security.config';

class NonceStore {
  // Map of Nonce -> ExpiryTimestamp
  private cache = new Map<string, number>();

  constructor() {
    // Simulated Redis TTL Cleanup
    setInterval(() => {
      this.cleanup();
    }, 5000);
  }

  public addNonce(nonce: string): boolean {
    if (this.cache.has(nonce)) {
      return false; // Already exists (Replay Attack)
    }
    const expiry = Date.now() + SecurityConfig.nonceTtlMs;
    this.cache.set(nonce, expiry);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(nonce);
      }
    }
  }

  public getActiveNonces(): Record<string, number> {
    return Object.fromEntries(this.cache);
  }
}

export const nonceStore = new NonceStore();
