import { Router, Request, Response } from 'express';
import { playIntegrityService } from '../services/PlayIntegrityService';
import { calculateRiskScore } from '../services/RiskEngine';
import { sessionStore, SessionState } from '../storage/session.store';
import { refreshStore } from '../storage/refresh.store';
import { securityLogger } from '../services/SecurityLogger';
import { EventBus, Events } from '../services/EventBus';

export const attestRouter = Router();

attestRouter.post('/', (req: Request, res: Response) => {
  const { deviceId, playIntegrityToken, nonce, sessionId } = req.body;

  if (!deviceId || !playIntegrityToken || !nonce) {
    return res.status(400).json({ error: 'Missing required attestation fields' });
  }

  // 1. Cryptographically verify the token
  const verdict = playIntegrityService.verifyToken(playIntegrityToken, nonce);

  if (!verdict.isValid) {
    // Attestation Failed!
    console.error(`[AttestAPI] Verification failed for device ${deviceId}: ${verdict.errorMessage}`);

    // Calculate a massive risk score because device integrity is compromised
    const riskScore = calculateRiskScore([{ type: 'ROOT_DETECTED' }]); // Forces score >= 40

    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId: sessionId || 'unknown',
      deviceId,
      riskScore,
      route: '/auth/attest',
      action: 'ATTESTATION_FAILED',
      details: verdict.errorMessage
    });

    // If there is an active session attached to this payload, REVOKE it immediately.
    // This is the Zero-Trust backend enforcement.
    if (sessionId) {
        sessionStore.updateState(sessionId, SessionState.REVOKED, 'Attestation Failed');
        refreshStore.revokeAllForSession(sessionId);
        EventBus.emit(Events.RISK_DETECTED, { severity: 'CRITICAL', type: 'ATTESTATION_FAILED', sessionId });
    }

    return res.status(403).json({ 
      error: 'Device Attestation Failed',
      details: verdict.errorMessage
    });
  }

  // 2. Attestation Succeeded
  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId: sessionId || 'unknown',
    deviceId,
    riskScore: 0,
    route: '/auth/attest',
    action: 'ATTESTATION_SUCCESS',
  });

  return res.json({ 
    success: true, 
    verdict: verdict.deviceRecognitionVerdict 
  });
});

// FAULT INJECTION ROUTE FOR QA TESTING
attestRouter.post('/debug/fault', (req: Request, res: Response) => {
  const { forceReject } = req.body;
  playIntegrityService.setFault(forceReject === true);
  res.json({ success: true, message: `Play Integrity Fault Injection set to: ${forceReject}` });
});
