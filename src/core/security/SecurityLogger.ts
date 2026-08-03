export interface SecurityEvent {
  timestamp: number;
  eventType: 'ROOT_DETECTED' | 'HOOK_DETECTED' | 'EMULATOR_DETECTED' | 'PINNING_FAILED' | 'BIOMETRIC_FAILED' | 'INVALID_SIGNATURE' | 'SESSION_TERMINATED' | 'BIOMETRIC_ENROLLED' | 'BIOMETRIC_LOGIN_SUCCESS' | 'BIOMETRIC_LOGIN_FAILED' | 'BIOMETRIC_LOCKOUT' | 'BIOMETRIC_KEY_INVALIDATED' | 'ATTESTATION_FAILED';
  deviceId: string;
  riskScore: number;
  details?: string;
}

class SecurityLogger {
  private static instance: SecurityLogger;
  private queue: SecurityEvent[] = [];

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Masks sensitive JWT tokens (Access, Refresh, Play Integrity, Bearer) from strings
   */
  private maskCredentials(log: string): string {
    if (!log) return log;
    
    // Mask Bearer tokens
    let masked = log.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED]');
    
    // Mask raw JWTs (eyJ...)
    masked = masked.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT REDACTED]');
    
    // Mask accessToken / refreshToken JSON fields (matches JWTs and UUIDs)
    masked = masked.replace(/(accessToken"?\s*:\s*"?)[A-Za-z0-9-_=.]*("?)/gi, '$1[REDACTED]$2');
    masked = masked.replace(/(refreshToken"?\s*:\s*"?)[A-Za-z0-9-_=.]*("?)/gi, '$1[REDACTED]$2');
    
    return masked;
  }

  private processLog(level: 'info' | 'warn' | 'error', ...args: any[]) {
    // Only log in DEV mode
    if (!__DEV__) {
        // In production, we completely suppress verbose 'info' logs
        if (level === 'info') return;
    }

    const processedArgs = args.map(arg => {
      if (typeof arg === 'string') return this.maskCredentials(arg);
      if (typeof arg === 'object') {
          try {
              return JSON.parse(this.maskCredentials(JSON.stringify(arg)));
          } catch (e) {
              return arg;
          }
      }
      return arg;
    });

    switch (level) {
      case 'info': console.info('[SecurityLogger]', ...processedArgs); break;
      case 'warn': console.warn('[SecurityLogger]', ...processedArgs); break;
      case 'error': console.error('[SecurityLogger]', ...processedArgs); break;
    }
  }

  public info(...args: any[]) { this.processLog('info', ...args); }
  public warn(...args: any[]) { this.processLog('warn', ...args); }
  public error(...args: any[]) { this.processLog('error', ...args); }

  public logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    // Ensure no credentials slipped into details
    const sanitizedDetails = event.details ? this.maskCredentials(event.details) : undefined;
    
    const fullEvent: SecurityEvent = {
      ...event,
      details: sanitizedDetails,
      timestamp: Date.now(),
    };
    
    this.queue.push(fullEvent);
    this.warn('Event logged locally:', fullEvent.eventType, fullEvent.details);
    
    this.attemptUpload();
  }

  private attemptUpload() {
    if (this.queue.length > 0) {
      // Placeholder for backend sync
    }
  }
}

export default SecurityLogger.getInstance();
