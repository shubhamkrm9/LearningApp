import { AppContext, RiskSeverity, SecurityEvent, ThreatType } from './SecurityState';
import SecurityLogger from './SecurityLogger';
import SecurityPolicyEngine from './SecurityPolicyEngine';

export class RiskEngine {
  private static instance: RiskEngine;
  private currentRiskScore: number = 0;
  private currentContext: AppContext = AppContext.BACKGROUND;
  private decayIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly DECAY_AMOUNT = 5;
  private readonly DECAY_INTERVAL_MS = 60000; // Decay every 60 seconds

  private constructor() {
    this.startRiskDecay();
  }

  public static getInstance(): RiskEngine {
    if (!RiskEngine.instance) {
      RiskEngine.instance = new RiskEngine();
    }
    return RiskEngine.instance;
  }

  /**
   * Updates the current app context (e.g. User navigated to Payment Screen)
   */
  public updateContext(newContext: AppContext) {
    SecurityLogger.info(`[RiskEngine] Context updated to: ${newContext}`);
    this.currentContext = newContext;
  }

  /**
   * Process a raw security event from a Detector Module
   */
  public processEvent(event: SecurityEvent) {
    SecurityLogger.warn(`[RiskEngine] Processing Threat: ${event.threatType}`);

    // Context-Aware Scoring Adjustments
    let effectiveSeverity = event.severity;

    // Example 1: Overlay on a highly sensitive screen is Critical
    if (event.threatType === ThreatType.OVERLAY_ACTIVE) {
      if (this.currentContext === AppContext.LOGIN_SCREEN || this.currentContext === AppContext.PAYMENT_SCREEN) {
        effectiveSeverity = RiskSeverity.CRITICAL;
        SecurityLogger.error(`[RiskEngine] Escalating OVERLAY to CRITICAL due to Context: ${this.currentContext}`);
      }
    }

    // Example 2: Accessibility on Assessment is Medium, but Payment is High
    if (event.threatType === ThreatType.UNKNOWN_ACCESSIBILITY_SERVICE) {
      if (this.currentContext === AppContext.PAYMENT_SCREEN) {
        effectiveSeverity = RiskSeverity.HIGH;
      }
    }

    // Map severity to a numerical score addition
    let scoreAddition = 0;
    switch (effectiveSeverity) {
      case RiskSeverity.LOW: scoreAddition = 10; break;
      case RiskSeverity.MEDIUM: scoreAddition = 30; break;
      case RiskSeverity.HIGH: scoreAddition = 60; break;
      case RiskSeverity.CRITICAL: scoreAddition = 100; break;
    }

    this.currentRiskScore = Math.min(this.currentRiskScore + scoreAddition, 100);
    SecurityLogger.info(`[RiskEngine] Risk Score updated: ${this.currentRiskScore}/100`);

    // Forward the evaluated risk to the Policy Engine for action
    SecurityPolicyEngine.evaluatePolicy(this.currentRiskScore, event, this.currentContext);
  }

  /**
   * Risk Decay Engine: Reduces risk score over time to recover from transient threats
   */
  private startRiskDecay() {
    if (this.decayIntervalId) clearInterval(this.decayIntervalId);
    
    this.decayIntervalId = setInterval(() => {
      if (this.currentRiskScore > 0) {
        this.currentRiskScore = Math.max(this.currentRiskScore - this.DECAY_AMOUNT, 0);
        if (this.currentRiskScore === 0) {
            SecurityLogger.info('[RiskEngine] Risk Score fully decayed back to Normal (0)');
        }
      }
    }, this.DECAY_INTERVAL_MS);
  }

  public getCurrentRiskScore(): number {
    return this.currentRiskScore;
  }

  public clearRisk() {
    this.currentRiskScore = 0;
  }
}

export default RiskEngine.getInstance();
