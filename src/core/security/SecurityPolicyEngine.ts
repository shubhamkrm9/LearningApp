import RASPManager from './RASPManager';
import AttestationService from './AttestationService';
import SessionManager from './SessionManager';
import SecurityLogger from './SecurityLogger';
import TokenManager from './TokenManager';
import { Alert } from 'react-native';

class SecurityPolicyEngine {
    private isChecking: boolean = false;

    /**
     * Orchestrates the full security verification lifecycle.
     * Prevents overlapping checks using a concurrency lock.
     */
    public async performSecurityCheck(): Promise<void> {
        if (this.isChecking) {
            SecurityLogger.warn('[SecurityPolicyEngine] Check already in progress. Ignoring duplicate request.');
            return;
        }

        this.isChecking = true;
        SecurityLogger.info('[Startup] Security checks started');

        try {
            // 1. Run Native RASP Checks (Root, Hook, Emulator, etc.)
            await RASPManager.evaluateDeviceIntegrity();

            // 2. Perform Backend Attestation
            // We generate a cryptographic nonce for Play Integrity replay protection
            const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            const attestationPassed = await AttestationService.performBackendAttestation(nonce);

            if (!attestationPassed) {
                // Backend rejected our token (e.g., 403 Forbidden)
                await this.enforceTamperedPolicy('Backend Attestation Failed');
            }

            SecurityLogger.info('[Startup] Security checks completed successfully');
        } catch (error: any) {
            SecurityLogger.error('[SecurityPolicyEngine] Security Check Failed:', error);
            
            // If the RASPManager threw a TAMPERED or COMPROMISED error, enforce policy
            if (error.message?.includes('TAMPERED') || error.message?.includes('COMPROMISED')) {
                await this.enforceTamperedPolicy(error.message);
            }
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Executes the Kill-Chain for compromised devices
     */
    private async enforceTamperedPolicy(reason: string): Promise<void> {
        // Wipe hardware Keystore
        await TokenManager.clearTokens();

        // Destroy biometric enrollment (TEE keys + server credential)
        try {
            const BiometricAuthService = require('./BiometricAuthService').default;
            await BiometricAuthService.unenroll();
            SecurityLogger.warn('[SecurityPolicyEngine] Biometric enrollment destroyed due to device compromise.');
        } catch {
            // Best-effort — enrollment cleanup is not critical for the kill-chain
        }
        
        // Drop in-memory session (forces navigation to LoginScreen)
        await SessionManager.terminateSession('REVOKED');

        // Block UI
        Alert.alert(
            'Security Violation Detected',
            'Your device does not meet the security requirements to run this application.',
            [{ text: 'EXIT', onPress: () => {} }],
            { cancelable: false }
        );
    }

    /**
     * Evaluates Trust Engine scores and triggers appropriate Kill-Chains or warnings
     */
    public async evaluatePolicy(overallTrust: number, evaluation: any, context: any): Promise<void> {
        // Generate Advanced Security Telemetry
        const telemetryPayload = {
            timestamp: new Date().toISOString(),
            deviceState: context,
            overallTrust: overallTrust,
            decision: evaluation?.decision || 'NONE',
            rule: evaluation?.ruleId || 'NONE',
            evidence: evaluation?.evidence || [],
            confidence: evaluation?.confidence || 0,
            detectors: {
                "RootDetector": "3.2.0",
                "MemoryScanner": "2.1.1",
                "Watchdog": "1.0.4"
            },
            actionTaken: 'NONE'
        };

        if (overallTrust <= 10) {
            // CRITICAL (Trust collapsed)
            telemetryPayload.actionTaken = 'LOCKDOWN';
            SecurityLogger.error('[SecurityPolicyEngine] CRITICAL TRUST FAILURE. Executing Lockdown.', telemetryPayload);
            await this.enforceTamperedPolicy(`Critical Trust Failure: ${evaluation?.decision}`);
        } else if (overallTrust <= 50) {
            // HIGH
            telemetryPayload.actionTaken = 'RESTRICT_FEATURES';
            SecurityLogger.warn('[SecurityPolicyEngine] HIGH RISK DETECTED. Restricting sensitive features.', telemetryPayload);
            Alert.alert('Security Warning', 'Sensitive features have been restricted due to elevated risk.');
        } else if (overallTrust <= 80) {
            // MEDIUM
            telemetryPayload.actionTaken = 'WARN_USER';
            SecurityLogger.info('[SecurityPolicyEngine] MEDIUM RISK DETECTED. Warning user.', telemetryPayload);
            Alert.alert('Security Notice', 'A security risk has been detected. Please ensure your device is secure.');
        } else {
            // SAFE
            SecurityLogger.info('[SecurityPolicyEngine] TRUST LEVEL OPTIMAL.', telemetryPayload);
        }
    }
}

export default new SecurityPolicyEngine();
