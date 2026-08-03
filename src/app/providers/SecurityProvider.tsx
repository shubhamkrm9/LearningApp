import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import SecurityPolicyEngine from '../../core/security/SecurityPolicyEngine';

export const SecurityProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        // Foreground Resume Check
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                SecurityPolicyEngine.performSecurityCheck();
            }
            appState.current = nextAppState;
        });

        // Periodic background checks (every 30 seconds for development, normally much longer)
        const intervalId = setInterval(() => {
            SecurityPolicyEngine.performSecurityCheck();
        }, 30000);

        return () => {
            subscription.remove();
            clearInterval(intervalId);
        };
    }, []);

    // We no longer block rendering with isSecure = false.
    // If the device is compromised, SecurityPolicyEngine instantly wipes the session,
    // which unmounts the protected routes anyway, and shows the Alert on top.
    return <>{children}</>;
};
