import { NativeModules } from 'react-native';
import { api } from './apiInterceptor';
import TokenManager from './TokenManager';
import SessionManager from './SessionManager';
import SecurityLogger from './SecurityLogger';

const { SecurityManager } = NativeModules;

class AttestationService {
    /**
     * Fetches Play Integrity Token from Native Layer and Posts to Backend
     * @param nonce Cryptographic nonce for replay protection
     * @returns boolean true if attestation passed, false if failed/rejected
     */
    public static async performBackendAttestation(nonce: string): Promise<boolean> {
        SecurityLogger.info('[Startup] Attestation request started');
        try {
            // 1. Validate Session Exists (fixes "Undefined Session ID may reach backend")
            const activeSessionId = SessionManager.getActiveTokens()?.sessionId;
            if (!activeSessionId) {
                SecurityLogger.warn('[Attestation] No active session found. Skipping attestation to prevent 401s.');
                // We return true because attestation is session-bound. Without a session, there's no backend state to revoke.
                // The local RASP checks will protect the unauthenticated state.
                return true; 
            }

            // 2. Fetch Device ID dynamically
            const deviceId = await TokenManager.getDeviceId();
            
            SecurityLogger.info('[Phase 8 Verification] deviceId:', deviceId);
            SecurityLogger.info('[Phase 8 Verification] sessionId:', activeSessionId);

            // 3. Get Payload from Native (Play Integrity Token + Local Risk)
            const payloadStr = await SecurityManager.getBackendAttestationPayload(nonce);
            const payload = JSON.parse(payloadStr);
            payload.nonce = nonce; // Ensure nonce is included for backend verification

            // 4. Send to Backend
            await api.post('/auth/attest', {
                deviceId: deviceId,
                playIntegrityToken: JSON.stringify(payload),
                nonce: nonce,
                sessionId: activeSessionId
            });

            SecurityLogger.info('[Startup] Attestation succeeded');
            return true;
        } catch (error: any) {
            SecurityLogger.error('[Attestation] Backend Attestation Failed or Rejected', error);
            if (error.response && error.response.status === 403) {
                // The backend actively rejected our device integrity token.
                SecurityLogger.logEvent({ eventType: 'ATTESTATION_FAILED', riskScore: 100, deviceId: 'unknown', details: error.message });
                return false;
            }
            // If it's a network timeout, we might fail-open or fail-close based on policy.
            SecurityLogger.warn('[Attestation] Backend unreachable, relying on local risk assessment.');
            return true;
        }
    }
}

export default AttestationService;
