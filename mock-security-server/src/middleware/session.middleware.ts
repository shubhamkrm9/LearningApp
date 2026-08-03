import { Request, Response, NextFunction } from 'express';
import { sessionStore, SessionState } from '../storage/session.store';
import { securityLogger } from '../services/SecurityLogger';

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.context;
  if (!sessionId) {
    return res.status(401).json({ error: 'Session ID not found in context' });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session not found' });
  }

  if (session.currentState === SessionState.REVOKED) {
    securityLogger.logAudit({
      requestId: req.context.requestId,
      timestamp: Date.now(),
      sessionId,
      deviceId: session.deviceId,
      riskScore: 90,
      route: req.originalUrl,
      action: 'API_DENIED',
      details: 'SESSION_REVOKED'
    });
    return res.status(401).json({ error: 'Session has been revoked' });
  }

  if (session.currentState === SessionState.LOGGED_OUT) {
    return res.status(401).json({ error: 'Session is logged out' });
  }

  // Update last seen
  sessionStore.updateState(sessionId, session.currentState, 'API Request');
  req.context.deviceId = session.deviceId;
  next();
};
