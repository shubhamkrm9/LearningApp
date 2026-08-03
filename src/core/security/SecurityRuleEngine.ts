import { SecurityEventPayload } from './SecurityEventBus';
import { SecurityCapability } from './TrustEngine';

export interface ThreatEvaluation {
  ruleId: string;
  decision: string;
  confidence: number;
  capability: SecurityCapability;
  trustReduction: number;
  evidence: string[];
}

/**
 * Replaces hardcoded if(score > 70) logic with configurable, correlatable rules.
 */
class SecurityRuleEngine {
  private static instance: SecurityRuleEngine;
  
  // State for correlation (stores recent events)
  private recentEvents: SecurityEventPayload[] = [];
  private readonly CORRELATION_WINDOW_MS = 60000; // 1 minute window

  private constructor() {}

  public static getInstance(): SecurityRuleEngine {
    if (!SecurityRuleEngine.instance) {
      SecurityRuleEngine.instance = new SecurityRuleEngine();
    }
    return SecurityRuleEngine.instance;
  }

  public evaluateThreat(newEvent: SecurityEventPayload): ThreatEvaluation | null {
    this.trackEvent(newEvent);

    // RULE-001: Overlay + Accessibility = Credential Theft
    if (this.hasRecentEvent('OVERLAY_ACTIVE') && this.hasRecentEvent('ACCESSIBILITY_ACTIVE')) {
      return {
        ruleId: 'RULE-001',
        decision: 'CREDENTIAL_THEFT_ATTEMPT',
        confidence: 98,
        capability: SecurityCapability.USER_TRUST,
        trustReduction: 100, // Immediate 0% Trust
        evidence: ['Overlay Detected', 'Accessibility Service Active']
      };
    }

    // RULE-002: Debugger + Frida = Instrumentation Attack
    if (this.hasRecentEvent('DEBUGGER_ATTACHED') && this.hasRecentEvent('HOOKING_DETECTED')) {
      return {
        ruleId: 'RULE-002',
        decision: 'INSTRUMENTATION_ATTACK',
        confidence: 100,
        capability: SecurityCapability.RUNTIME_TRUST,
        trustReduction: 100,
        evidence: ['Debugger Attached', 'Frida Port Open']
      };
    }

    // RULE-003: Isolated Overlay
    if (newEvent.data?.threatType === 'OVERLAY_ACTIVE') {
      return {
        ruleId: 'RULE-003',
        decision: 'ISOLATED_OVERLAY',
        confidence: 35,
        capability: SecurityCapability.USER_TRUST,
        trustReduction: 20, // Only reduce trust by 20%
        evidence: ['Overlay Detected without Accessibility']
      };
    }

    // RULE-004: Native Watchdog Missed Heartbeat
    if (newEvent.data?.threatType === 'DETECTOR_KILLED') {
      return {
        ruleId: 'RULE-004',
        decision: 'SECURITY_FRAMEWORK_COMPROMISED',
        confidence: 100,
        capability: SecurityCapability.APPLICATION_TRUST,
        trustReduction: 100,
        evidence: ['Watchdog Thread Suspended or Killed']
      };
    }

    return null;
  }

  private trackEvent(event: SecurityEventPayload) {
    this.recentEvents.push(event);
    
    // Purge old events outside correlation window
    const now = Date.now();
    this.recentEvents = this.recentEvents.filter(e => now - e.timestamp < this.CORRELATION_WINDOW_MS);
  }

  private hasRecentEvent(threatType: string): boolean {
    return this.recentEvents.some(e => e.data?.threatType === threatType);
  }
}

export default SecurityRuleEngine.getInstance();
