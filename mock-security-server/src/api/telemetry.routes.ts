import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { sessionMiddleware } from '../middleware/session.middleware';
import { securityLogger } from '../services/SecurityLogger';
import { calculateRiskScore } from '../services/RiskEngine';
import { evaluatePolicy } from '../services/PolicyEngine';

export const telemetryRouter = Router();

// Endpoint for the mobile client to send telemetry
telemetryRouter.post('/', jwtMiddleware, sessionMiddleware, (req: Request, res: Response) => {
  const { events } = req.body;
  const { sessionId, deviceId } = req.context;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid telemetry payload' });
  }

  // Log telemetry internally
  events.forEach(event => securityLogger.logTelemetry({ ...event, sessionId, deviceId }));

  // Calculate Risk
  const additionalRisk = calculateRiskScore(events);
  
  // Here we would lookup deviceStore and add to total device risk, 
  // but for simplicity we'll just evaluate the current batch
  const policyAction = evaluatePolicy(sessionId as string, deviceId as string, additionalRisk);

  res.json({ success: true, policyAction });
});
