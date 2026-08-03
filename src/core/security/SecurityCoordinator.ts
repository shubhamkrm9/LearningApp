import RiskEngine from './RiskEngine';
import { SecurityEvent, ThreatType, RiskSeverity, AppContext } from './SecurityState';
import SecurityLogger from './SecurityLogger';
import { AppState, AppStateStatus } from 'react-native';

export class SecurityCoordinator {
  private static instance: SecurityCoordinator;
  private backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private currentAppState: AppStateStatus = 'active';

  private constructor() {
    this.setupLifecycleListeners();
  }

  public static getInstance(): SecurityCoordinator {
    if (!SecurityCoordinator.instance) {
      SecurityCoordinator.instance = new SecurityCoordinator();
    }
    return SecurityCoordinator.instance;
  }

  /**
   * Event-Driven: Hook into React Native AppState lifecycle
   */
  private setupLifecycleListeners() {
    AppState.addEventListener('change', (nextAppState) => {
      this.currentAppState = nextAppState;
      if (nextAppState === 'background') {
        this.onAppBackgrounded();
      } else if (nextAppState === 'active') {
        this.onAppForegrounded();
      }
    });
  }

  private onAppBackgrounded() {
    SecurityLogger.info('[SecurityCoordinator] App backgrounded.');
    RiskEngine.updateContext(AppContext.BACKGROUND);
    
    // Stop aggressive polling when backgrounded to save battery
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private onAppForegrounded() {
    SecurityLogger.info('[SecurityCoordinator] App foregrounded.');
    // Trigger an immediate lifecycle check on resume
    this.triggerLifecycleCheck('RESUME');
  }

  /**
   * Triggered explicitly by App navigation or critical flows
   */
  public triggerLifecycleCheck(flow: 'LOGIN' | 'RESUME' | 'PAYMENT' | 'ASSESSMENT') {
    SecurityLogger.info(`[SecurityCoordinator] Lifecycle check triggered for flow: ${flow}`);
    
    switch (flow) {
      case 'LOGIN': RiskEngine.updateContext(AppContext.LOGIN_SCREEN); break;
      case 'PAYMENT': RiskEngine.updateContext(AppContext.PAYMENT_SCREEN); break;
      case 'ASSESSMENT': RiskEngine.updateContext(AppContext.ASSESSMENT_SCREEN); break;
      default: RiskEngine.updateContext(AppContext.HOME_SCREEN); break;
    }

    // Here we would call out to native modules to get synchronous snapshots
    // e.g., NativeModules.SecurityManager.checkOverlay()
  }

  /**
   * Event-Driven Interface: Modules push events here dynamically
   */
  public dispatchEvent(threat: ThreatType, severity: RiskSeverity, details?: string) {
    const event: SecurityEvent = {
      threatType: threat,
      severity,
      timestamp: Date.now(),
      details
    };
    RiskEngine.processEvent(event);
  }

  /**
   * Starts lightweight polling for modules that cannot be purely event-driven (e.g. Memory Scan)
   */
  public startScheduledPolling() {
    if (this.backgroundTimer) return;

    this.backgroundTimer = setInterval(() => {
      if (this.currentAppState !== 'active') return;
      
      // Perform scheduled scans (e.g. Memory Scan every 5 seconds)
      // NativeModules.SecurityManager.performMemoryScan()
      
    }, 5000);
  }
}

export default SecurityCoordinator.getInstance();
