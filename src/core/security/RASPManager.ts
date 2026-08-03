import JailMonkey from 'jail-monkey';
import TokenManager from './TokenManager';
import SessionManager from './SessionManager';
import SecurityLogger from './SecurityLogger';

/**
 * Fault Injection Flags
 * 
 * In __DEV__ mode, these flags allow QA engineers to force specific
 * detection outcomes without requiring a real compromised device.
 * In production builds, these flags are ignored entirely.
 */
interface FaultFlags {
  forceRoot: boolean;
  forceHook: boolean;
  forceEmulator: boolean;
}

export interface RASPResult {
  isCompromised: boolean;
  detections: string[];
  timestamp: number;
}

export class RASPManager {
  private static instance: RASPManager;

  // Fault injection — only effective when __DEV__ === true
  private faultFlags: FaultFlags = {
    forceRoot: false,
    forceHook: false,
    forceEmulator: false,
  };

  private constructor() {}

  public static getInstance(): RASPManager {
    if (!RASPManager.instance) {
      RASPManager.instance = new RASPManager();
    }
    return RASPManager.instance;
  }

  /**
   * QA/Debug only: Inject a simulated compromise state.
   * This is ignored in production builds.
   */
  public injectFault(flags: Partial<FaultFlags>): void {
    if (!__DEV__) {
      console.warn('[RASP] Fault injection ignored in production build.');
      return;
    }
    this.faultFlags = { ...this.faultFlags, ...flags };
    console.log('[RASP] Fault flags updated:', JSON.stringify(this.faultFlags));
  }

  /**
   * QA/Debug only: Clear all injected faults.
   */
  public clearFaults(): void {
    this.faultFlags = { forceRoot: false, forceHook: false, forceEmulator: false };
    console.log('[RASP] All fault flags cleared.');
  }

  /**
   * Evaluates the device integrity on startup or foreground resume.
   * Returns a structured result indicating whether the device is compromised
   * and which detections triggered.
   */
  public async evaluateDeviceIntegrity(): Promise<RASPResult> {
    console.log('[RASP] ═══════════════════════════════════════');
    console.log('[RASP] Evaluating device integrity...');

    const detections: string[] = [];

    // --- Detection Layer (each check logged individually) ---

    // 1. Root / Jailbreak
    const isRooted = (__DEV__ && this.faultFlags.forceRoot) || JailMonkey.isJailBroken();
    console.log(`[RASP]   Root/Jailbreak..... ${isRooted ? '⛔ YES' : '✅ NO'}`);
    if (isRooted) {
      detections.push('ROOT_DETECTED');
    }

    // 2. Hooking / Frida / Xposed
    const isHooked = (__DEV__ && this.faultFlags.forceHook) || JailMonkey.hookDetected();
    console.log(`[RASP]   Hooking/Frida...... ${isHooked ? '⛔ YES' : '✅ NO'}`);
    if (isHooked) {
      detections.push('HOOK_DETECTED');
    }

    // 3. Debugger / Dev Settings
    const isDevMode = await JailMonkey.isDevelopmentSettingsMode();
    console.log(`[RASP]   Dev Settings....... ${isDevMode ? '⚠️ YES' : '✅ NO'}`);

    // 4. Emulator (only enforced in production)
    const isEmulator = (__DEV__ && this.faultFlags.forceEmulator) || (!__DEV__ && isDevMode);
    const emulatorPolicy = __DEV__ ? 'ALLOW (dev build)' : (isEmulator ? '⛔ BLOCK' : '✅ ALLOW');
    console.log(`[RASP]   Emulator Policy.... ${emulatorPolicy}`);
    if (isEmulator) {
      detections.push('EMULATOR_DETECTED');
    }

    // 5. Mock Location (logged but not enforced)
    const hasMockLocation = JailMonkey.canMockLocation();
    console.log(`[RASP]   Mock Location...... ${hasMockLocation ? '⚠️ YES (not enforced)' : '✅ NO'}`);

    // --- Verdict ---
    const isCompromised = detections.length > 0;
    console.log('[RASP]   ─────────────────────────────────────');
    console.log(`[RASP]   Integrity.......... ${isCompromised ? '⛔ FAIL' : '✅ PASS'}`);
    console.log(`[RASP]   Result............. ${isCompromised ? 'DEVICE_COMPROMISED' : 'DEVICE_SECURE'}`);
    console.log('[RASP] ═══════════════════════════════════════');

    const result: RASPResult = {
      isCompromised,
      detections,
      timestamp: Date.now(),
    };

    // --- Policy Enforcement Layer ---

    if (result.isCompromised) {
      console.error(`[RASP] 🚨 SECURITY VIOLATION: ${detections.join(', ')} 🚨`);

      // 1. Log each detection as a separate security event
      for (const detection of detections) {
        SecurityLogger.logEvent({
          eventType: detection as any,
          deviceId: await TokenManager.getDeviceId(),
          riskScore: 100,
          details: `RASP detection triggered: ${detection}`,
        });
      }

      // 2. Zeroize all secrets in hardware Keystore
      console.log('[RASP] Clearing hardware Keystore...');
      await TokenManager.clearTokens();

      // 3. Drop runtime session state — forces RootNavigator to Login
      console.log('[RASP] Terminating session...');
      await SessionManager.terminateSession('REVOKED');

      console.log('[RASP] Policy enforcement complete. Session destroyed.');
    } else {
      console.log('[RASP] No policy action required. Session unaffected.');
    }

    return result;
  }
}

export default RASPManager.getInstance();
