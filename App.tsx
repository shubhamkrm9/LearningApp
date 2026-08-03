import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createSDKStore } from './src/app/store';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { SecurityProvider } from './src/app/providers/SecurityProvider';
import SecurityPolicyEngine from './src/core/security/SecurityPolicyEngine';
import SessionManager from './src/core/security/SessionManager';
import SecurityLogger from './src/core/security/SecurityLogger';

const store = createSDKStore();

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      SecurityLogger.info('[Startup] Session restoration started');
      try {
        const unlocked = await SessionManager.unlockSession();
        if (unlocked) {
          SecurityLogger.info('[Startup] Session restored from Keystore');
          SecurityLogger.info('[Phase 9 Verification] Session Restored:', SessionManager.getActiveTokens());
        } else {
          SecurityLogger.info('[Startup] No stored session. Login screen will be shown.');
          // Note: Biometric login auto-trigger is handled by LoginScreen itself
          // to ensure proper navigation context. We don't trigger it here.
        }
      } catch (e) {
        SecurityLogger.warn('[Startup] Session restoration failed, defaulting to logged out state.');
        await SessionManager.terminateSession('LOGGED_OUT');
      }

      SecurityLogger.info('[Startup] Security checks started');
      try {
          await SecurityPolicyEngine.performSecurityCheck();
      } catch (e) {
          SecurityLogger.warn('[Startup] Security checks threw an error (handled by policy engine).');
      }
      
      SecurityLogger.info('[Startup] Startup completed');
      setIsInitializing(false);
    };

    initializeApp();

    const subscription = AppState.addEventListener('change', nextAppState => {
      // Transitioned to FOREGROUND
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTimestamp.current) {
          const idleTime = Date.now() - backgroundTimestamp.current;
          if (idleTime > 30 * 1000) { // 30 seconds (for testing)
            console.log('[Security] App idle for > 30 secs. Forcing biometric unlock.');
            SessionManager.unlockSession().then(() => {
                // Check security after we unlock
                SecurityPolicyEngine.performSecurityCheck();
            }).catch(() => {
                SessionManager.terminateSession('LOGGED_OUT');
            });
          }
        }
        backgroundTimestamp.current = null;
      }

      // Transitioned to BACKGROUND
      if (nextAppState === 'background') {
        backgroundTimestamp.current = Date.now();
        console.log('[Security] App entered background. Dropping secrets from RAM.');
        // Zeroize memory tokens instantly
        SessionManager.lockSession();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isInitializing) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a'}}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SecurityProvider>
          <RootNavigator />
        </SecurityProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
