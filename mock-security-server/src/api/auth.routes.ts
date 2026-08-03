import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateAccessToken } from '../crypto/jwt';
import { sessionStore, SessionState } from '../storage/session.store';
import { refreshStore } from '../storage/refresh.store';
import { deviceStore } from '../storage/device.store';
import { securityLogger } from '../services/SecurityLogger';
import { EventBus, Events } from '../services/EventBus';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password, deviceId } = req.body;
  // Mock users table
  const mockUsers: Record<string, { password: string; userId: string }> = {
    'John': { password: '12345', userId: 'user-123' },
    'shubham': { password: '12345', userId: 'user-456' },
  };

  const user = mockUsers[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const userId = user.userId;
  const sessionId = uuidv4();
  
  // Register/Update Device
  deviceStore.registerDevice({ uuid: deviceId, appVersion: req.headers['x-app-version'] as string });

  // Create Session
  sessionStore.createSession(sessionId, deviceId, userId);
  sessionStore.updateState(sessionId, SessionState.ACTIVE, 'Successful Login');

  // Generate Tokens
  const accessToken = generateAccessToken({ sub: userId, sid: sessionId, role: 'admin' });
  const refreshToken = uuidv4();

  refreshStore.saveToken(refreshToken, {
    sessionId,
    deviceId, // Bind the device ID explicitly to this refresh token
    issued: Date.now(),
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30d
    rotationCount: 0,
    lastUsed: Date.now(),
    status: 'ACTIVE'
  });

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId,
    deviceId,
    riskScore: 0,
    route: '/auth/login',
    action: 'LOGIN_SUCCESS'
  });

  res.json({ accessToken, refreshToken, sessionId });
});

authRouter.post('/refresh', (req: Request, res: Response) => {
  // Layer 2 Session Trust: Requires Session ID and Device ID along with Refresh Token
  const { refreshToken, deviceId, sessionId } = req.body;
  
  if (!refreshToken || !deviceId || !sessionId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // The store automatically hashes the token before lookup
  const meta = refreshStore.getToken(refreshToken);

  if (!meta) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Device Binding Mismatch Detection
  if (meta.deviceId !== deviceId || meta.sessionId !== sessionId) {
    sessionStore.updateState(meta.sessionId, SessionState.REVOKED, 'Device Mismatch Detected');
    refreshStore.revokeAllForSession(meta.sessionId);
    
    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId: meta.sessionId,
      deviceId,
      riskScore: 100,
      route: '/auth/refresh',
      action: 'DEVICE_MISMATCH'
    });

    return res.status(403).json({ error: 'Session revoked due to device mismatch' });
  }

  // Replay Detection
  if (meta.status === 'REVOKED' || meta.status === 'USED') {
    // REPLAY DETECTED - REVOKE ENTIRE SESSION
    sessionStore.updateState(meta.sessionId, SessionState.REVOKED, 'Refresh Replay Detected');
    refreshStore.revokeAllForSession(meta.sessionId);
    EventBus.emit(Events.RISK_DETECTED, { severity: 'HIGH', type: 'REFRESH_REPLAY', sessionId: meta.sessionId });
    
    securityLogger.logAudit({
      requestId: req.context?.requestId,
      timestamp: Date.now(),
      sessionId: meta.sessionId,
      deviceId,
      riskScore: 90,
      route: '/auth/refresh',
      action: 'REFRESH_REPLAY'
    });
    
    return res.status(401).json({ error: 'Session revoked due to replay' });
  }

  const session = sessionStore.getSession(meta.sessionId);
  if (!session || session.currentState === SessionState.REVOKED || session.currentState === SessionState.LOGGED_OUT) {
    return res.status(401).json({ error: 'Session is inactive' });
  }

  // Rotate token
  meta.status = 'USED';
  meta.lastUsed = Date.now();
  
  const newRefreshToken = uuidv4();
  refreshStore.saveToken(newRefreshToken, {
    sessionId: meta.sessionId,
    deviceId: meta.deviceId,
    issued: Date.now(),
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
    rotationCount: meta.rotationCount + 1,
    lastUsed: Date.now(),
    status: 'ACTIVE'
  });

  sessionStore.updateState(meta.sessionId, SessionState.REFRESHING);
  sessionStore.updateState(meta.sessionId, SessionState.ACTIVE);

  const newAccessToken = generateAccessToken({ sub: session.userId, sid: session.sessionId, role: 'admin' });

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId: meta.sessionId,
    deviceId: session.deviceId,
    riskScore: 0,
    route: '/auth/refresh',
    action: 'TOKEN_ROTATED'
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  sessionStore.updateState(sessionId, SessionState.LOGGED_OUT, 'User requested logout');
  refreshStore.revokeAllForSession(sessionId);

  securityLogger.logAudit({
    requestId: req.context?.requestId,
    timestamp: Date.now(),
    sessionId,
    deviceId: 'unknown',
    riskScore: 0,
    route: '/auth/logout',
    action: 'SESSION_LOGGED_OUT'
  });

  res.json({ success: true });
});
