import { EventEmitter } from 'events';

export const EventBus = new EventEmitter();

// Event Definitions
export const Events = {
  RISK_DETECTED: 'RISK_DETECTED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  REPLAY_ATTACK: 'REPLAY_ATTACK',
  AUDIT_LOG: 'AUDIT_LOG'
};
