import axios from 'axios';
import { SecureStore } from './SecureStore';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

// Example: Import your React Native module that requests the Play Integrity or App Attest token
// import { IntegrityManager } from '../security/IntegrityManager';

const API_BASE_URL = 'https://api.learningapp.com/v1';

export const ApiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor: Attach Access Token, DeviceID, and HMAC Signature
ApiClient.interceptors.request.use(
    async (config) => {
        const accessToken = await SecureStore.getToken('access_token');
        const deviceId = await SecureStore.getToken('device_id');
        const sessionId = await SecureStore.getToken('session_id') || 'sess-default';
        const userId = await SecureStore.getToken('user_id') || 'user-default';
        const deviceSecret = await SecureStore.getToken('device_secret') || 'fallback_secret_for_dev';

        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (deviceId) {
            config.headers['X-Device-ID'] = deviceId;
        }

        // --- HMAC REQUEST SIGNING (Phase 6) ---
        // Generates a unique signature for each request to prevent token replay
        const timestamp = Date.now().toString();
        const nonce = CryptoJS.lib.WordArray.random(16).toString(); // 32 hex chars
        const method = config.method?.toUpperCase() || 'GET';
        const urlPath = config.url || '';
        const bodyStr = config.data ? JSON.stringify(config.data) : '';

        // Payload binds the request to the specific Device, User, and Session
        const payloadToSign = `${method}:${urlPath}:${bodyStr}:${timestamp}:${nonce}:${deviceId}:${userId}:${sessionId}`;
        
        // Sign with HMAC-SHA256 using the hardware-protected Device Secret
        const signature = CryptoJS.HmacSHA256(payloadToSign, deviceSecret).toString(CryptoJS.enc.Base64);

        config.headers['X-Timestamp'] = timestamp;
        config.headers['X-Nonce'] = nonce;
        config.headers['X-Session-ID'] = sessionId;
        config.headers['X-User-ID'] = userId;
        config.headers['X-Signature'] = signature;

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and Refresh Token Rotation
ApiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the backend returns 401 Unauthorized, the token is expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // If the error specifically indicates Token Theft/Reuse (e.g., custom error code 401-02)
            if (error.response?.data?.errorCode === 'TOKEN_REUSE_DETECTED') {
                console.error('CRITICAL: Token reuse detected. Session revoked by server.');
                await SecureStore.secureLogout();
                // Redirect user to login screen...
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue other requests while refreshing
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return ApiClient(originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await SecureStore.getToken('refresh_token');
                const deviceId = await SecureStore.getToken('device_id');
                
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Gather Attestation for the refresh request (Play Integrity / App Attest)
                // const attestationToken = await IntegrityManager.getAttestationToken();
                const attestationToken = "dummy_attestation_token_for_sprint_2"; // Replace with actual module call

                // 1. Request a new Access + Refresh Token pair
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: refreshToken,
                    attestationToken: attestationToken,
                    deviceId: deviceId,
                    platform: Platform.OS
                });

                const newAccessToken = response.data.accessToken;
                const newRefreshToken = response.data.refreshToken;

                // 2. Save the newly rotated tokens
                await SecureStore.saveToken('access_token', newAccessToken);
                await SecureStore.saveToken('refresh_token', newRefreshToken);

                // 3. Process queued requests
                processQueue(null, newAccessToken);
                isRefreshing = false;

                // Retry original request
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return ApiClient(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                
                // If refresh fails, wipe session entirely
                await SecureStore.secureLogout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
