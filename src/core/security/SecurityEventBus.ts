export enum SecurityEventType {
  // Detector Heartbeats
  HEARTBEAT_ROOT_DETECTOR = 'HEARTBEAT_ROOT_DETECTOR',
  HEARTBEAT_WATCHDOG = 'HEARTBEAT_WATCHDOG',
  HEARTBEAT_MEMORY_SCANNER = 'HEARTBEAT_MEMORY_SCANNER',
  HEARTBEAT_OVERLAY_DETECTOR = 'HEARTBEAT_OVERLAY_DETECTOR',
  
  // Threats
  THREAT_DETECTED = 'THREAT_DETECTED',

  // Trust Score Updates
  TRUST_SCORE_UPDATED = 'TRUST_SCORE_UPDATED',
  
  // Policy Actions
  POLICY_ACTION_TRIGGERED = 'POLICY_ACTION_TRIGGERED'
}

export interface SecurityEventPayload {
  timestamp: number;
  type: SecurityEventType;
  source: string;      // The detector/component generating the event (e.g., 'RootDetector v3.2.0')
  data?: any;          // Custom payload (e.g. { capability: 'ApplicationTrust', score: 60 })
}

type SecurityEventListener = (event: SecurityEventPayload) => void;

/**
 * A lightweight, strictly-typed, deterministic Event Bus (Observer Pattern).
 * This eliminates the dependency on Node's EventEmitter and ensures predictable, 
 * synchronous execution order for security analysis.
 */
class SecurityEventBus {
  private static instance: SecurityEventBus;
  private listeners: Map<SecurityEventType, Set<SecurityEventListener>> = new Map();

  private constructor() {}

  public static getInstance(): SecurityEventBus {
    if (!SecurityEventBus.instance) {
      SecurityEventBus.instance = new SecurityEventBus();
    }
    return SecurityEventBus.instance;
  }

  /**
   * Subscribe to a specific security event.
   */
  public subscribe(eventType: SecurityEventType, listener: SecurityEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Unsubscribe from a specific security event.
   */
  public unsubscribe(eventType: SecurityEventType, listener: SecurityEventListener): void {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.delete(listener);
    }
  }

  /**
   * Publish an event synchronously to all registered listeners.
   */
  public publish(event: SecurityEventPayload): void {
    if (this.listeners.has(event.type)) {
      const handlers = this.listeners.get(event.type)!;
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          // If a handler crashes, log it but don't stop the bus.
          // In a real framework, this might trigger a Self-Protection failure event.
          console.error(`[SecurityEventBus] Error in listener for ${event.type}:`, error);
        }
      }
    }
  }
}

export default SecurityEventBus.getInstance();
