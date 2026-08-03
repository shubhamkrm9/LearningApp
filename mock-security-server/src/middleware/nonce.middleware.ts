import { Request, Response, NextFunction } from 'express';
import { nonceStore } from '../storage/nonce.store';
import { securityLogger } from '../services/SecurityLogger';

export const nonceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const nonce = req.headers['x-amz-nonce'] as string;
  if (!nonce) {
    return res.status(400).json({ error: 'Missing x-amz-nonce header' });
  }

  const isUnique = nonceStore.addNonce(nonce);
  if (!isUnique) {
    securityLogger.logReplayAttempt({
      nonce,
      timestamp: Date.now(),
      ip: req.context.ip,
      sessionId: req.context.sessionId
    });
    return res.status(401).json({ error: 'Replay attack detected' });
  }

  next();
};
