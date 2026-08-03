import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { biometricStore } from '../storage/biometric.store';
import { sessionStore, SessionState } from '../storage/session.store';
import { refreshStore } from '../storage/refresh.store';
import { deviceStore } from '../storage/device.store';
import { generateAccessToken } from '../crypto/jwt';
import { securityLogger } from '../services/SecurityLogger';
import { SecurityConfig } from '../config/security.config';

export const biometricRouter = Router();

// ─── POST /enroll ────────────────────────────────────────────────────────────
// Requires: User must already be authenticated (has valid session from password login)
// Body: { publicKey, deviceId, sessionId }
biometricRouter.post('/enroll', (req: Request, res: Response) => {
  const { publicKey, deviceId, sessionId } = req.body;

  if (!publicKey || !deviceId || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields: publicKey, deviceId, sessionId' });
  }

  // Verify the session is active (user must have logged in with password first)
  const session = sessionStore.getSession(sessionId);
  if (!session || session.currentState !== SessionState.ACTIVE) {
    return res.status(401).json({ error: 'Invalid or inactive session. Please log in with password first.' });
  }

  // Verify device matches session
  if (session.deviceId !== deviceId) {
    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId,
      deviceId,
      riskScore: 80,
      route: '/auth/biometric/enroll',
      action: 'BIOMETRIC_ENROLL_DEVICE_MISMATCH'
    });
    return res.status(403).json({ error: 'Device mismatch. Cannot enroll biometric for a different device.' });
  }

  // Enroll the credential
  biometricStore.enrollCredential(session.userId, deviceId, publicKey);

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId,
    deviceId,
    riskScore: 0,
    route: '/auth/biometric/enroll',
    action: 'BIOMETRIC_ENROLLED'
  });

  console.log(`[Biometric] Enrolled biometric credential for user=${session.userId}, device=${deviceId}`);

  res.json({ enrolled: true, userId: session.userId });
});

// ─── POST /challenge ─────────────────────────────────────────────────────────
// Body: { deviceId }
// Returns a one-time challenge nonce that the client must sign with their TEE private key
biometricRouter.post('/challenge', (req: Request, res: Response) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing required field: deviceId' });
  }

  // Verify device has enrolled biometric credentials
  const credential = biometricStore.getCredentialByDevice(deviceId);
  if (!credential) {
    return res.status(404).json({ error: 'No biometric credential enrolled for this device.' });
  }

  // Check if device is locked due to too many failures
  if (biometricStore.isLocked(deviceId)) {
    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId: 'none',
      deviceId,
      riskScore: 60,
      route: '/auth/biometric/challenge',
      action: 'BIOMETRIC_DEVICE_LOCKED'
    });
    return res.status(429).json({ error: 'Device is temporarily locked due to too many failed attempts.' });
  }

  // Generate challenge
  const challengeTtlMs = SecurityConfig.biometric?.challengeTtlMs ?? 60000;
  const challengeEntry = biometricStore.createChallenge(deviceId, challengeTtlMs);

  console.log(`[Biometric] Challenge issued for device=${deviceId}, expires in ${challengeTtlMs / 1000}s`);

  res.json({
    challenge: challengeEntry.challenge,
    expiresIn: Math.floor(challengeTtlMs / 1000),
  });
});

// ─── POST /verify ────────────────────────────────────────────────────────────
// Body: { deviceId, challenge, signature }
// Verifies the signed challenge against the enrolled public key
biometricRouter.post('/verify', (req: Request, res: Response) => {
  const { deviceId, challenge, signature } = req.body;

  if (!deviceId || !challenge || !signature) {
    return res.status(400).json({ error: 'Missing required fields: deviceId, challenge, signature' });
  }

  // 1. Lookup the enrolled credential
  const credential = biometricStore.getCredentialByDevice(deviceId);
  if (!credential) {
    return res.status(401).json({ error: 'No biometric credential found for this device.' });
  }

  // 2. Check lockout
  if (biometricStore.isLocked(deviceId)) {
    return res.status(429).json({ error: 'Device is temporarily locked.' });
  }

  // 3. Consume the challenge (single-use + TTL check)
  const challengeEntry = biometricStore.consumeChallenge(challenge, deviceId);
  if (!challengeEntry) {
    const maxFailures = SecurityConfig.biometric?.maxFailures ?? 5;
    const lockoutMs = SecurityConfig.biometric?.lockoutDurationMs ?? 30000;
    biometricStore.incrementFailure(deviceId, maxFailures, lockoutMs);

    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId: 'none',
      deviceId,
      riskScore: 40,
      route: '/auth/biometric/verify',
      action: 'BIOMETRIC_CHALLENGE_INVALID'
    });

    return res.status(401).json({ error: 'Challenge expired, already used, or invalid.' });
  }

  // 4. Verify the cryptographic signature
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(Buffer.from(challenge, 'base64'));
    verifier.end();

    const isValid = verifier.verify(
      credential.publicKey,
      Buffer.from(signature, 'base64')
    );

    if (!isValid) {
      const maxFailures = SecurityConfig.biometric?.maxFailures ?? 5;
      const lockoutMs = SecurityConfig.biometric?.lockoutDurationMs ?? 30000;
      const failures = biometricStore.incrementFailure(deviceId, maxFailures, lockoutMs);

      securityLogger.logAudit({
        requestId: req.context?.requestId,
        timestamp: Date.now(),
        sessionId: 'none',
        deviceId,
        riskScore: 70,
        route: '/auth/biometric/verify',
        action: 'BIOMETRIC_SIGNATURE_INVALID',
        details: `Failure count: ${failures}`
      });

      console.error(`[Biometric] Signature verification FAILED for device=${deviceId}`);
      return res.status(401).json({ error: 'Signature verification failed.' });
    }
  } catch (error: any) {
    console.error(`[Biometric] Crypto verification error:`, error.message);
    return res.status(401).json({ error: 'Signature verification error.' });
  }

  // 5. Signature is VALID — issue new session and tokens
  const userId = credential.userId;
  const sessionId = uuidv4();

  // Register/Update Device
  deviceStore.registerDevice({ uuid: deviceId, appVersion: req.headers['x-app-version'] as string });

  // Create Session
  sessionStore.createSession(sessionId, deviceId, userId);
  sessionStore.updateState(sessionId, SessionState.ACTIVE, 'Biometric Login');

  // Generate Tokens
  const accessToken = generateAccessToken({ sub: userId, sid: sessionId, role: 'admin', authMethod: 'biometric' });
  const refreshToken = uuidv4();

  refreshStore.saveToken(refreshToken, {
    sessionId,
    deviceId,
    issued: Date.now(),
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30d
    rotationCount: 0,
    lastUsed: Date.now(),
    status: 'ACTIVE'
  });

  // Update credential usage
  biometricStore.updateLastUsed(deviceId);

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId,
    deviceId,
    riskScore: 0,
    route: '/auth/biometric/verify',
    action: 'BIOMETRIC_LOGIN_SUCCESS'
  });

  console.log(`[Biometric] ✅ Login successful for user=${userId}, device=${deviceId}, session=${sessionId}`);

  res.json({ accessToken, refreshToken, sessionId });
});

// ─── POST /unenroll ──────────────────────────────────────────────────────────
// Body: { deviceId, sessionId }
biometricRouter.post('/unenroll', (req: Request, res: Response) => {
  const { deviceId, sessionId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing required field: deviceId' });
  }

  const removed = biometricStore.removeCredential(deviceId);

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId: sessionId || 'none',
    deviceId,
    riskScore: 0,
    route: '/auth/biometric/unenroll',
    action: 'BIOMETRIC_UNENROLLED'
  });

  console.log(`[Biometric] Unenrolled biometric credential for device=${deviceId}, existed=${removed}`);

  res.json({ unenrolled: true });
});

// ─── GET /status ─────────────────────────────────────────────────────────────
// Query: ?deviceId=xxx
// Returns whether biometric is enrolled for the given device
biometricRouter.get('/status', (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing required query parameter: deviceId' });
  }

  const credential = biometricStore.getCredentialByDevice(deviceId);

  res.json({
    enrolled: !!credential,
    userId: credential?.userId || null,
    enrolledAt: credential?.enrolledAt || null,
    locked: biometricStore.isLocked(deviceId),
  });
});
