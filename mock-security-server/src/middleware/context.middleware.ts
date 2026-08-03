import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  sessionId?: string;
  deviceId?: string;
  userId?: string;
  route: string;
  ip: string;
  timestamp: number;
  riskScore: number;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.context = {
    requestId: uuidv4(),
    route: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    timestamp: Date.now(),
    riskScore: 0,
    
    // These get populated later by auth/session middleware
    sessionId: undefined,
    deviceId: undefined,
    userId: undefined
  };

  next();
};
