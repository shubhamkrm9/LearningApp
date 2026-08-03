import SecurityEventBus, { SecurityEventType, SecurityEventPayload } from './SecurityEventBus';
import SecurityRuleEngine from './SecurityRuleEngine';
import SecurityLogger from './SecurityLogger';

/**
 * Trust Capabilities
 */
export enum SecurityCapability {
  DEVICE_TRUST = 'DEVICE_TRUST',
  RUNTIME_TRUST = 'RUNTIME_TRUST',
  APPLICATION_TRUST = 'APPLICATION_TRUST',
  SESSION_TRUST = 'SESSION_TRUST',
  USER_TRUST = 'USER_TRUST'
}

/**
 * TrustEngine transitions us away from "Risk Scores" to "Trust Scores".
 * Every capability starts at 100% Trust.
 */
export class TrustEngine {
  private static instance: TrustEngine;
  
  // Track Trust levels (0 to 100)
  private trustScores: Record<SecurityCapability, number> = {
    [SecurityCapability.DEVICE_TRUST]: 100,
    [SecurityCapability.RUNTIME_TRUST]: 100,
    [SecurityCapability.APPLICATION_TRUST]: 100,
    [SecurityCapability.SESSION_TRUST]: 100,
    [SecurityCapability.USER_TRUST]: 100,
  };

  private constructor() {
    this.setupBusSubscriptions();
  }

  public static getInstance(): TrustEngine {
    if (!TrustEngine.instance) {
      TrustEngine.instance = new TrustEngine();
    }
    return TrustEngine.instance;
  }

  private setupBusSubscriptions() {
    SecurityEventBus.subscribe(SecurityEventType.THREAT_DETECTED, this.handleThreatEvent.bind(this));
  }

  private handleThreatEvent(event: SecurityEventPayload) {
    // Pass raw event into Rule Engine for Threat Correlation
    // The Rule Engine decides the Confidence and the Capability Impact
    const evaluation = SecurityRuleEngine.evaluateThreat(event);

    if (evaluation) {
      this.reduceTrust(evaluation.capability, evaluation.trustReduction);
      
      // Publish the new Trust Score so PolicyEngine can act
      SecurityEventBus.publish({
        timestamp: Date.now(),
        type: SecurityEventType.TRUST_SCORE_UPDATED,
        source: 'TrustEngine v1.0.0',
        data: {
          overallTrust: this.getOverallTrust(),
          capabilities: { ...this.trustScores },
          latestEvaluation: evaluation
        }
      });
    }
  }

  /**
   * Reduces trust for a specific capability. 
   * (e.g. Accessibility detected -> UserTrust reduced)
   */
  private reduceTrust(capability: SecurityCapability, amount: number) {
    const current = this.trustScores[capability];
    this.trustScores[capability] = Math.max(0, current - amount);
    SecurityLogger.warn(`[TrustEngine] ${capability} Trust reduced by ${amount}%. Current: ${this.trustScores[capability]}%`);
  }

  /**
   * Overall trust is the lowest common denominator, not an average.
   * If Application Trust is 0%, the Overall Trust is 0%.
   */
  public getOverallTrust(): number {
    return Math.min(...Object.values(this.trustScores));
  }
}

export default TrustEngine.getInstance();
