import { Router, Request, Response } from 'express';
import { sessionStore } from '../storage/session.store';
import { nonceStore } from '../storage/nonce.store';

export const debugRouter = Router();

// In-memory store of active faults
export const ActiveFaults: Record<string, boolean> = {
  refreshTimeout: false,
  rejectHMAC: false,
  revokeNextSession: false,
  simulateRedisDown: false,
  simulateLatency: false
};

debugRouter.post('/fault', (req: Request, res: Response) => {
  const faults = req.body;
  Object.assign(ActiveFaults, faults);
  res.json({ message: 'Faults injected', activeFaults: ActiveFaults });
});

debugRouter.get('/session/:id', (req: Request, res: Response) => {
  const session = sessionStore.getSession(req.params.id as string);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

debugRouter.get('/nonces', (req: Request, res: Response) => {
  res.json(nonceStore.getActiveNonces());
});
