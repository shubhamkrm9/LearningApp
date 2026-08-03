import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import TokenManager from './TokenManager';
import SessionManager from './SessionManager';
import SecurityLogger from './SecurityLogger';
import { signRequest } from './RequestSigner';

// Define standard backend API
export const api = axios.create({
  baseURL: 'http://10.243.14.222:3000',
  timeout: 15000,
});

// Mock refresh token endpoint logic (implementing Layer 2 Session Trust)
const refreshTokenApi = async (refreshToken: string, sessionId: string, deviceId: string) => {
  const response = await axios.post('http://10.243.14.222:3000/auth/refresh', {
    refreshToken,
    sessionId,
    deviceId
  });
  return response.data; // { accessToken, refreshToken }
};

// Phase 9: Request Signing & Token Attachment
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Attempt to get tokens from memory to avoid Biometric spam (Feedback UX)
    const tokens = SessionManager.getActiveTokens();

    if (tokens?.accessToken) {
      config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    // Sign the request
    const method = config.method || 'GET';
    const url = config.url || '';
    const data = config.data;
    const headers = config.headers as Record<string, string>;

    const signedHeaders = signRequest(method, url, data, headers);
    
    config.headers['x-amz-date'] = signedHeaders['x-amz-date'];
    config.headers['x-amz-nonce'] = signedHeaders['x-amz-nonce'];
    config.headers['x-amz-signature'] = signedHeaders['Authorization']; // Custom signature header

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Phase 3: Token Rotation and Race Condition Queueing
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized, token has expired
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (TokenManager.getIsRefreshing()) {
        // Refresh is already in progress, queue this request
        return new Promise(function(resolve, reject) {
          TokenManager.subscribeTokenRefresh(
            (token: string) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              resolve(api(originalRequest));
            },
            (err: any) => {
              reject(err);
            }
          );
        });
      }

      originalRequest._retry = true;
      TokenManager.setIsRefreshing(true);

      try {
        // We still fetch from Keystore for the actual refresh operation to ensure high security boundary
        const currentTokens = await TokenManager.getTokens();
        if (!currentTokens?.refreshToken) {
          throw new Error('No refresh token available');
        }

        const deviceId = await TokenManager.getDeviceId();
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshTokenApi(
          currentTokens.refreshToken,
          currentTokens.sessionId,
          deviceId
        );
        
        const updatedTokens = {
          ...currentTokens,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || currentTokens.refreshToken,
        };

        // Save the newly rotated access token
        await TokenManager.setTokens(updatedTokens);
        SessionManager.updateInMemoryTokens(updatedTokens);

        TokenManager.setIsRefreshing(false);
        TokenManager.onRefreshed(newAccessToken);

        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return api(originalRequest);
        
      } catch (refreshError) {
        TokenManager.setIsRefreshing(false);
        TokenManager.onRefreshFailed(refreshError);
        
        // Revoke session completely on failure
        await SessionManager.terminateSession('REVOKED');
        
        SecurityLogger.logEvent({
          eventType: 'INVALID_SIGNATURE',
          deviceId: await TokenManager.getDeviceId(),
          riskScore: 75,
          details: 'Failed to refresh token, session revoked'
        });
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
