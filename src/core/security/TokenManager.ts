import * as Keychain from 'react-native-keychain';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

class TokenManager {
  private static instance: TokenManager;
  
  // Refresh Queue State
  private isRefreshing: boolean = false;
  private refreshQueue: Array<(token: string) => void> = [];
  private failedQueue: Array<(error: any) => void> = [];

  private readonly SERVICE_NAME = 'com.learningapp.auth';
  private readonly DEVICE_ID_KEY = 'com.learningapp.device_id';

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Generates or retrieves the UUID Device Binding
   */
  public async getDeviceId(): Promise<string> {
    try {
      const savedDevice = await Keychain.getGenericPassword({ service: this.DEVICE_ID_KEY });
      if (savedDevice) {
        return savedDevice.password;
      }
      
      const newDeviceId = uuidv4();
      await Keychain.setGenericPassword('device', newDeviceId, { service: this.DEVICE_ID_KEY });
      return newDeviceId;
    } catch (error) {
      console.error('Failed to get or set Device ID', error);
      return 'unknown_device';
    }
  }

  /**
   * securely store tokens in the Android Keystore / iOS Keychain
   */
  public async setTokens(tokens: Tokens): Promise<void> {
    try {
      const tokenString = JSON.stringify(tokens);
      await Keychain.setGenericPassword('auth', tokenString, {
        service: this.SERVICE_NAME,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('Error securely storing tokens', error);
      throw error;
    }
  }

  /**
   * Retrieves decrypted tokens via Biometric prompt
   */
  public async getTokens(): Promise<Tokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.SERVICE_NAME,
      });

      if (credentials) {
        return JSON.parse(credentials.password) as Tokens;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving tokens from Keystore', error);
      return null;
    }
  }

  /**
   * Removes tokens (Revocation / Logout)
   */
  public async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: this.SERVICE_NAME });
    } catch (error) {
      console.error('Error clearing tokens', error);
    }
  }

  // --- Queueing Mechanism for Refresh Races (Phase 3) ---

  public getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  public setIsRefreshing(isRefreshing: boolean): void {
    this.isRefreshing = isRefreshing;
  }

  public subscribeTokenRefresh(cb: (token: string) => void, errCb: (error: any) => void): void {
    this.refreshQueue.push(cb);
    this.failedQueue.push(errCb);

    // (Feedback 2) 15-second refresh timeout to prevent indefinite hanging
    setTimeout(() => {
      if (this.refreshQueue.includes(cb)) {
        this.onRefreshFailed(new Error('Refresh Token Timeout'));
      }
    }, 15000);
  }

  public onRefreshed(token: string): void {
    this.refreshQueue.forEach(cb => cb(token));
    this.refreshQueue = [];
    this.failedQueue = [];
  }

  public onRefreshFailed(error: any): void {
    this.failedQueue.forEach(cb => cb(error));
    this.refreshQueue = [];
    this.failedQueue = [];
  }
}

export default TokenManager.getInstance();
