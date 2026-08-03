import { EventBus, Events } from './EventBus';

export interface AuditLog {
  requestId: string;
  timestamp: number;
  sessionId?: string;
  deviceId?: string;
  riskScore: number;
  route: string;
  action: string;
  details?: string;
}

class SecurityLogger {
  
  public logAudit(log: AuditLog) {
    // In production, this would go to ELK/Datadog.
    // For V&V, we just log to stdout or store it for tests to assert on.
    console.log('[AUDIT]', JSON.stringify(log));
  }

  public logTelemetry(event: any) {
    console.log('[TELEMETRY]', JSON.stringify(event));
    
    // Route high risk telemetries to the PolicyEngine via EventBus
    if (event.severity === 'HIGH') {
       EventBus.emit(Events.RISK_DETECTED, event);
    }
  }

  public logReplayAttempt(attempt: any) {
    console.warn('[SECURITY_EVENT] REPLAY_ATTACK', attempt);
    EventBus.emit(Events.REPLAY_ATTACK, attempt);
  }
}

export const securityLogger = new SecurityLogger();
