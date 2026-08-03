import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../crypto/jwt';

export const jwtMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.context.userId = payload.sub;
    req.context.sessionId = payload.sid;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token signature' });
  }
};
