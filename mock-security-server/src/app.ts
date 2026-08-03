import express from 'express';
import { requestContextMiddleware } from './middleware/context.middleware';
import { authRouter } from './api/auth.routes';
import { attestRouter } from './api/attest.routes';
import { telemetryRouter } from './api/telemetry.routes';
import { biometricRouter } from './api/biometric.routes';
import { debugRouter, ActiveFaults } from './api/debug.routes';
import { jwtMiddleware } from './middleware/jwt.middleware';
import { sessionMiddleware } from './middleware/session.middleware';
import { nonceMiddleware } from './middleware/nonce.middleware';
import { hmacMiddleware } from './middleware/hmac.middleware';

const app = express();
app.use(express.json());
app.use(requestContextMiddleware);

// Fault Injection Middleware (Simulated Latency)
app.use((req, res, next) => {
  if (ActiveFaults.simulateLatency) {
    setTimeout(next, 3000);
  } else {
    next();
  }
});

// Routes
app.use('/auth', authRouter);
app.use('/auth/attest', attestRouter);
app.use('/auth/biometric', biometricRouter);
app.use('/telemetry', telemetryRouter);

// Protected Mock Data Route (Simulates the main enterprise API)
// Requires JWT -> Session -> Nonce (Replay) -> HMAC
app.post('/api/protected/data', jwtMiddleware, sessionMiddleware, nonceMiddleware, hmacMiddleware, (req, res) => {
  res.json({ data: 'Secure Enterprise Data', sessionContext: req.context });
});

// Protect Debug routes (ONLY available in testing)
if (process.env.NODE_ENV === 'testing') {
  app.use('/debug', debugRouter);
  console.log('⚠️ Debug and Fault Injection Endpoints Enabled');
}

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Security Verification Backend running on 0.0.0.0:${PORT}`);
});
