const request = require('supertest');
const { google } = require('googleapis');
const app = require('./play-integrity-verifier');

// Mock googleapis
jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({})),
      },
      playintegrity: jest.fn().mockReturnValue({
        v1: {
          decodeIntegrityToken: jest.fn(),
        },
      }),
    },
  };
});

describe('Backend Validation (Test 7)', () => {
  let decodeMock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    decodeMock = google.playintegrity().v1.decodeIntegrityToken;
  });

  test('Valid Token & Valid Native State -> ALLOWED', async () => {
    decodeMock.mockResolvedValue({
      data: {
        tokenPayloadExternal: {
          deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY', 'MEETS_STRONG_INTEGRITY'] },
          appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED' },
          accountDetails: { appLicensingVerdict: 'LICENSED' }
        }
      }
    });

    const response = await request(app)
      .post('/verify-device')
      .send({ integrityToken: 'valid-token-123', nativeRiskLevel: 'SAFE' });

    expect(response.status).toBe(200);
    expect(response.body.accessGranted).toBe(true);
  });

  test('Tampered Native State (Valid Token) -> DENIED', async () => {
    decodeMock.mockResolvedValue({
      data: {
        tokenPayloadExternal: {
          deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] },
          appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED' },
          accountDetails: { appLicensingVerdict: 'LICENSED' }
        }
      }
    });

    const response = await request(app)
      .post('/verify-device')
      .send({ integrityToken: 'valid-token-123', nativeRiskLevel: 'TAMPERED' });

    expect(response.status).toBe(403);
    expect(response.body.accessGranted).toBe(false);
    expect(response.body.reason).toContain('Native Security Engine detected tampering');
  });

  test('Invalid/Replay Token -> DENIED (500/403 Error)', async () => {
    // Google API throws an error for invalid token
    decodeMock.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .post('/verify-device')
      .send({ integrityToken: 'invalid-token', nativeRiskLevel: 'SAFE' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');
  });

  test('Failed Play App Integrity (Repackaged APK) -> DENIED', async () => {
    decodeMock.mockResolvedValue({
      data: {
        tokenPayloadExternal: {
          deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] },
          appIntegrity: { appRecognitionVerdict: 'UNRECOGNIZED_VERSION' }, // FAILED
          accountDetails: { appLicensingVerdict: 'LICENSED' }
        }
      }
    });

    const response = await request(app)
      .post('/verify-device')
      .send({ integrityToken: 'valid-token-123', nativeRiskLevel: 'SAFE' });

    expect(response.status).toBe(403);
    expect(response.body.accessGranted).toBe(false);
    expect(response.body.reason).toContain('App Integrity Failed');
  });

  test('Failed Device Integrity (Rooted/Shamiko bypass but bootloader unlocked) -> DENIED', async () => {
    decodeMock.mockResolvedValue({
      data: {
        tokenPayloadExternal: {
          deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_BASIC_INTEGRITY'] }, // MISSING DEVICE_INTEGRITY
          appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED' },
          accountDetails: { appLicensingVerdict: 'LICENSED' }
        }
      }
    });

    const response = await request(app)
      .post('/verify-device')
      .send({ integrityToken: 'valid-token-123', nativeRiskLevel: 'SAFE' });

    expect(response.status).toBe(403);
    expect(response.body.accessGranted).toBe(false);
    expect(response.body.reason).toContain('Device failed Play Integrity');
  });

  // --- LEVEL 5 TESTS ---

  test('Token Reuse Test -> TOKEN_REUSE_DETECTED', async () => {
    // 1. First, consume the valid refresh token (Device A)
    const res1 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token', deviceId: 'device-A', attestationToken: 'mock' });
    
    expect(res1.status).toBe(200);
    expect(res1.body.accessToken).toBeDefined();

    // 2. Now, replay the SAME refresh token (Device B or stolen)
    const res2 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token', deviceId: 'device-B', attestationToken: 'mock' });
    
    expect(res2.status).toBe(401);
    expect(res2.body.errorCode).toBe('TOKEN_REUSE_DETECTED');

    // 3. Ensure device is banned
    const res3 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'some-other-token', deviceId: 'device-B', attestationToken: 'mock' });
    
    expect(res3.status).toBe(403);
    expect(res3.body.errorCode).toBe('DEVICE_BANNED');
  });
});
