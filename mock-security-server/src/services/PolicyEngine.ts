import { SecurityConfig } from '../config/security.config';
import { EventBus, Events } from './EventBus';
import { sessionStore, SessionState } from '../storage/session.store';

export const evaluatePolicy = (sessionId: string, deviceId: string, riskScore: number): string => {
  const { riskThreshold } = SecurityConfig;
  
  if (riskScore >= riskThreshold.revoke) {
    sessionStore.updateState(sessionId, SessionState.REVOKED, 'Risk Score Exceeded Revoke Threshold');
    EventBus.emit(Events.SESSION_REVOKED, { sessionId, reason: 'High Risk' });
    return 'REVOKE_SESSION';
  }
  if (riskScore >= riskThreshold.block) {
    return 'BLOCK_SENSITIVE_APIS';
  }
  if (riskScore >= riskThreshold.relogin) {
    sessionStore.updateState(sessionId, SessionState.LOGGED_OUT, 'Risk Score Exceeded Relogin Threshold');
    return 'REQUIRE_RELOGIN';
  }
  if (riskScore >= riskThreshold.biometric) {
    return 'REQUIRE_BIOMETRICS';
  }
  return 'ALLOW';
};
