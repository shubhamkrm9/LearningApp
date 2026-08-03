import * as Keychain from 'react-native-keychain';
import axios from 'axios';

const API_BASE_URL = 'https://api.learningapp.com/v1';

/**
 * A highly secure, hardware-backed storage wrapper replacing AsyncStorage for sensitive data.
 * Under the hood:
 * - Android: EncryptedSharedPreferences (Android Keystore)
 * - iOS: Keychain
 */
export const SecureStore = {
    /**
     * Stores a sensitive token or session identifier.
     * @param key The identifier for the stored item
     * @param value The secret value
     */
    saveToken: async (key: string, value: string): Promise<boolean> => {
        try {
            await Keychain.setGenericPassword(key, value, {
                service: key, // Use key as the service namespace
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
                securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
            });
            return true;
        } catch (error) {
            console.error(`SecureStore: Failed to save token for key ${key}`, error);
            return false;
        }
    },

    /**
     * Retrieves a stored sensitive token.
     * @param key The identifier for the stored item
     */
    getToken: async (key: string): Promise<string | null> => {
        try {
            const credentials = await Keychain.getGenericPassword({ service: key });
            if (credentials) {
                return credentials.password;
            }
            return null;
        } catch (error) {
            console.error(`SecureStore: Failed to get token for key ${key}`, error);
            return null;
        }
    },

    /**
     * Removes a specific token.
     * @param key The identifier for the stored item
     */
    removeToken: async (key: string): Promise<boolean> => {
        try {
            await Keychain.resetGenericPassword({ service: key });
            return true;
        } catch (error) {
            console.error(`SecureStore: Failed to remove token for key ${key}`, error);
            return false;
        }
    },

    /**
     * Performs a comprehensive secure logout by wiping all known sensitive keys.
     * Ensure to call this during user logout or when a TAMPERED event is detected.
     */
    secureLogout: async (knownKeys: string[] = ['access_token', 'refresh_token', 'session_id', 'attestation_token', 'device_id']) => {
        console.log('Initiating Secure Logout...');
        
        // 0. Attempt Server-Side Revocation
        try {
            const refreshToken = await SecureStore.getToken('refresh_token');
            const deviceId = await SecureStore.getToken('device_id');
            
            if (refreshToken) {
                await axios.post(`${API_BASE_URL}/auth/revoke`, {
                    refreshToken,
                    deviceId
                }, { timeout: 5000 });
                console.log('Server-side token revocation successful.');
            }
        } catch (error) {
            console.error('Server-side revocation failed, proceeding with local wipe.', error);
        }

        // 1. Wipe Hardware Storage
        const wipePromises = knownKeys.map(key => Keychain.resetGenericPassword({ service: key }));
        await Promise.all(wipePromises);
        
        // 2. Wipe memory references in this scope if any caches existed
        
        // Note: The caller (e.g., Redux store, Context) is responsible for wiping its own memory.
        console.log('Secure Storage keys wiped successfully.');
    }
};
