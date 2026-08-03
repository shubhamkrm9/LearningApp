import { Request, Response, NextFunction } from 'express';
import { generateSignature, hashBody } from '../crypto/hmac';
import { SecurityConfig } from '../config/security.config';
import { ActiveFaults } from '../api/debug.routes';
import { nonceStore } from '../storage/nonce.store';
import { securityLogger } from '../services/SecurityLogger';

const MOCK_SECRET = 'ENTERPRISE_HMAC_SECRET_123';

export const hmacMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const dateHeader = req.headers['x-amz-date'] as string;
  const signatureHeader = req.headers['x-amz-signature'] as string;
  const nonce = req.headers['x-amz-nonce'] as string;

  if (!dateHeader || !signatureHeader || !nonce) {
    return res.status(400).json({ error: 'Missing HMAC headers' });
  }

  // 1. Clock skew validation
  const requestTime = parseInt(dateHeader, 10);
  const now = Date.now();
  if (Math.abs(now - requestTime) > SecurityConfig.replayWindowMs) {
    securityLogger.logAudit({
      requestId: req.context.requestId,
      timestamp: Date.now(),
      sessionId: req.context.sessionId,
      deviceId: 'unknown',
      riskScore: 60,
      route: req.originalUrl,
      action: 'HMAC_FAILED',
      details: 'CLOCK_SKEW_OR_EXPIRED'
    });
    return res.status(401).json({ error: 'Request timestamp outside acceptable window' });
  }

  // 1.5 Nonce Replay Validation
  if (!nonceStore.addNonce(nonce)) {
    securityLogger.logAudit({
      requestId: req.context.requestId,
      timestamp: Date.now(),
      sessionId: req.context.sessionId,
      deviceId: 'unknown',
      riskScore: 90, // High risk
      route: req.originalUrl,
      action: 'HMAC_FAILED',
      details: 'NONCE_REPLAY'
    });
    // Return generic error to client to prevent enumeration
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  // 2. Reconstruct Canonical Request
  const method = req.method.toUpperCase();
  const uri = req.originalUrl.split('?')[0]; // Simple URI extraction
  
  // Canonical Headers (Must match client logic)
  const canonicalHeaders = `host:${req.headers.host || 'localhost'}\nx-amz-date:${dateHeader}\nx-amz-nonce:${nonce}\n`;
  const signedHeaders = 'host;x-amz-date;x-amz-nonce';

  const bodyStr = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
  const payloadHash = hashBody(bodyStr);

  const canonicalRequest = `${method}\n${uri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // 3. Verify Signature
  const expectedSignature = generateSignature(canonicalRequest, MOCK_SECRET);
  if (expectedSignature !== signatureHeader || ActiveFaults.rejectHMAC) {
    req.context.riskScore += 50; // Add risk score for invalid signature
    
    securityLogger.logAudit({
      requestId: req.context.requestId,
      timestamp: Date.now(),
      sessionId: req.context.sessionId,
      deviceId: 'unknown',
      riskScore: req.context.riskScore,
      route: req.originalUrl,
      action: 'HMAC_FAILED',
      details: 'INVALID_SIGNATURE'
    });

    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
};
