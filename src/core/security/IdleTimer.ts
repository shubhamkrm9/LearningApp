import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SessionManager from './SessionManager';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const useIdleTimer = (onIdle: () => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    // Start initial timer
    resetTimer();

    // Listen for background/foreground transitions
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, optionally trigger biometric re-auth immediately here
        // depending on strictness of enterprise policy, but for now just reset the idle timer.
        resetTimer();
      } else if (nextAppState === 'background') {
        // App went to background, you could immediately lock it, or let the timer keep ticking.
      }
      appState.current = nextAppState;
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.remove();
    };
  }, []);

  return { resetTimer };
};

/**
 * Enterprise implementation example:
 * Wrap the root component in a <View onTouchStart={resetTimer}>
 * to catch all interactions and reset the timer. When `onIdle` fires,
 * call `SessionManager.lockSession()` to clear in-memory tokens.
 * The UI should then navigate to a "Locked" screen requiring a Biometric prompt
 * via `SessionManager.unlockSession()` before resuming.
 */
