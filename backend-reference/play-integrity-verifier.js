/**
 * Play Integrity Verification Backend Reference Implementation
 * 
 * Dependencies:
 * npm install express googleapis body-parser jsonwebtoken
 */

const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(bodyParser.json());

// --- RATE LIMITERS ---
const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts.' }});
const refreshLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Too many refresh attempts.' }});
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Too many API requests.' }});


// 1. Service Account Configuration
// Ensure you have downloaded the Service Account JSON from Google Cloud Console
// and granted it the "Play Integrity API" permissions.
const KEY_PATH = './play-integrity-service-account.json';
const PACKAGE_NAME = 'com.learningapp';

// Initialize the Google Auth Client
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/playintegrity'],
});

const playintegrity = google.playintegrity({
    version: 'v1',
    auth: auth,
});

/**
 * Endpoint: /verify-device
 * 
 * The React Native app must send:
 * 1. The Play Integrity Token
 * 2. The Native App Risk Level (SAFE, COMPROMISED, TAMPERED)
 * 3. User Authentication details (omitted here for simplicity)
 */
// --- IN-MEMORY DBS FOR RISK & DEVICE MANAGEMENT ---
const userDevices = new Map(); // userId -> Set of deviceIds (Max 2)
const deviceDetails = new Map(); // deviceId -> { firstSeen, lastIp, riskScore }

// Risk Engine Weights
const RISK_WEIGHTS = {
    EMULATOR: 20,
    ROOT_OR_TAMPERED: 30,
    ACCESSIBILITY_ACTIVE: 5,
    IMPOSSIBLE_TRAVEL: 30,
    HMAC_MISMATCH: 50,
    AUTOMATION_DETECTED: 40,
    DEVICE_MISMATCH: 40
};

app.post('/verify-device', loginLimiter, async (req, res) => {
    const { integrityToken, nativeRiskLevel, userId, deviceId, accessibilityEnabled, botDetected } = req.body;

    if (!integrityToken || !nativeRiskLevel || !userId || !deviceId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Decrypt and Verify Token via Google (Simplified for demo)
        // const response = await playintegrity.v1.decodeIntegrityToken(...)
        const meetsDeviceIntegrity = true; // Mocked
        const meetsAppIntegrity = true; // Mocked

        // 2. Risk Score Engine
        let riskScore = 0;
        
        if (nativeRiskLevel === 'COMPROMISED' || nativeRiskLevel === 'TAMPERED') {
            riskScore += RISK_WEIGHTS.ROOT_OR_TAMPERED;
        }
        if (accessibilityEnabled) {
            riskScore += RISK_WEIGHTS.ACCESSIBILITY_ACTIVE; // Just a signal, not a block
        }
        if (botDetected) {
            riskScore += RISK_WEIGHTS.AUTOMATION_DETECTED;
        }
        if (!meetsDeviceIntegrity) {
            riskScore += RISK_WEIGHTS.EMULATOR;
        }

        // 3. Concurrent Sessions Management (Max 2)
        if (!userDevices.has(userId)) {
            userDevices.set(userId, new Set());
        }
        const devices = userDevices.get(userId);
        
        if (!devices.has(deviceId)) {
            if (devices.size >= 2) {
                // Auto-revoke oldest device (Simplified by clearing set, in reality you'd keep track of age)
                devices.clear(); 
            }
            devices.add(deviceId);
        }

        // Store device details
        deviceDetails.set(deviceId, { firstSeen: Date.now(), lastIp: req.ip, riskScore });

        // 4. Decision Matrix
        if (riskScore >= 70) {
            return res.status(403).json({ status: 'REJECTED', accessGranted: false, reason: 'Risk Score too high.' });
        } else if (riskScore >= 40) {
            return res.json({ status: 'CHALLENGE', accessGranted: false, message: 'Re-authentication required.' });
        }

        return res.json({ status: 'VERIFIED', accessGranted: true, message: 'Device is secure.', riskScore });

    } catch (error) {
        console.error('Integrity verification failed:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- MOCK DATABASE FOR REFRESH TOKENS ---
const activeRefreshTokens = new Map(); // Maps refreshToken -> deviceId
const compromisedDevices = new Set(); // Devices flagged for token reuse

// Mock DB for Device Secrets
const deviceSecrets = new Map();
deviceSecrets.set('device-A', 'fallback_secret_for_dev');
deviceSecrets.set('device-B', 'fallback_secret_for_dev');

// --- HMAC Request Validation Middleware ---
const verifyHmacSignature = (req, res, next) => {
    // Skip signature check on initial login/auth endpoints where secret might not exist yet
    if (req.path === '/verify-device' || req.path.startsWith('/auth/login')) {
        return next();
    }

    const deviceId = req.headers['x-device-id'] || 'device-A';
    const userId = req.headers['x-user-id'] || 'user-default';
    const sessionId = req.headers['x-session-id'] || 'sess-default';
    const timestamp = req.headers['x-timestamp'];
    const nonce = req.headers['x-nonce'];
    const clientSignature = req.headers['x-signature'];

    if (!timestamp || !nonce || !clientSignature) {
        return res.status(401).json({ errorCode: 'MISSING_SIGNATURE' });
    }

    // Replay Protection (e.g., within 60 seconds)
    const now = Date.now();
    if (now - parseInt(timestamp, 10) > 60000) {
        return res.status(401).json({ errorCode: 'REQUEST_EXPIRED' });
    }

    const deviceSecret = deviceSecrets.get(deviceId) || 'fallback_secret_for_dev';
    const method = req.method.toUpperCase();
    const urlPath = req.url;
    // We must rebuild the exact body string that the client used.
    // In express, req.body is already parsed, so JSON.stringify(req.body) might differ slightly 
    // due to key ordering or whitespace. For robust implementations, we use raw body.
    const bodyStr = req.rawBody ? req.rawBody.toString() : (Object.keys(req.body).length ? JSON.stringify(req.body) : '');

    const payloadToSign = `${method}:${urlPath}:${bodyStr}:${timestamp}:${nonce}:${deviceId}:${userId}:${sessionId}`;
    
    const expectedSignature = crypto.createHmac('sha256', deviceSecret)
                                    .update(payloadToSign)
                                    .digest('base64');

    if (clientSignature !== expectedSignature) {
        console.error(`[HMAC ALARM] Forged request detected for device: ${deviceId}`);
        return res.status(401).json({ errorCode: 'INVALID_SIGNATURE' });
    }

    next();
};

app.use(verifyHmacSignature);

/**
 * Endpoint: /auth/refresh
 * Simulates Refresh Token Rotation and Theft Detection
 */
// --- REFRESH ABUSE TRACKING ---
const refreshAbuseMap = new Map(); // deviceId -> { count, windowStart }

app.post('/auth/refresh', refreshLimiter, async (req, res) => {
    const { refreshToken, deviceId, attestationToken } = req.body;

    if (compromisedDevices.has(deviceId)) {
        return res.status(403).json({ errorCode: 'DEVICE_BANNED', message: 'Device is permanently blocked.' });
    }

    if (!attestationToken) {
        return res.status(400).json({ errorCode: 'MISSING_ATTESTATION', message: 'Attestation token required.' });
    }

    // Refresh Abuse Tracking
    const now = Date.now();
    let abuseData = refreshAbuseMap.get(deviceId) || { count: 0, windowStart: now };
    
    if (now - abuseData.windowStart > 120000) { // 2 minute window
        abuseData = { count: 0, windowStart: now };
    }
    
    // Check Refresh Token Family
    if (!activeRefreshTokens.has(refreshToken)) {
        abuseData.count += 1;
        refreshAbuseMap.set(deviceId, abuseData);

        if (abuseData.count >= 10) {
            console.error(`[SECURITY ALERT] ACCOUNT_ATTACK on DeviceID: ${deviceId}`);
            compromisedDevices.add(deviceId);
            return res.status(403).json({ errorCode: 'ACCOUNT_ATTACK', message: 'Too many invalid refresh attempts. Device banned.' });
        }

        return res.status(401).json({ errorCode: 'TOKEN_INVALID', message: 'Token invalid or reused.' });
    }

    // Device Binding Check
    const boundDeviceId = activeRefreshTokens.get(refreshToken);
    if (boundDeviceId !== deviceId) {
        console.warn(`[RISK] Token for device ${boundDeviceId} attempted on ${deviceId}`);
        // Increase risk instead of instant perm-ban
        const details = deviceDetails.get(deviceId) || { riskScore: 0 };
        details.riskScore += 40; 
        deviceDetails.set(deviceId, details);

        if (details.riskScore >= 70) {
            compromisedDevices.add(deviceId);
            return res.status(403).json({ errorCode: 'RISK_TOO_HIGH', message: 'Device blocked due to anomalies.' });
        }
        
        return res.status(401).json({ errorCode: 'DEVICE_MISMATCH', message: 'Token not bound to this device. Re-authenticate.' });
    }

    // 4. Perform Rotation
    activeRefreshTokens.delete(refreshToken);

    const newAccessToken = 'access_' + Date.now();
    const newRefreshToken = 'refresh_' + Date.now();
    
    activeRefreshTokens.set(newRefreshToken, deviceId);

    return res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    });
});

// Example Course API to demonstrate rate limiting
app.get('/api/courses', apiLimiter, (req, res) => {
    res.json({ courses: [] });
});

/**
 * Endpoint: /auth/revoke
 * Removes the active session and prevents token reuse.
 */
app.post('/auth/revoke', (req, res) => {
    const { refreshToken } = req.body;
    activeRefreshTokens.delete(refreshToken);
    return res.status(200).json({ message: 'Session revoked' });
});

if (require.main === module) {
    app.listen(3000, () => {
        console.log('Play Integrity Verification Server running on port 3000');
    });
}

module.exports = app;
