import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, AppStateStatus, PanResponder, View } from 'react-native';

interface AntiAutomationContextType {
    isScreenReaderEnabled: boolean;
    botDetected: boolean;
    validateModuleSpeed: (moduleId: string, expectedMinimumSeconds: number, actualTimeSeconds: number) => boolean;
}

const AntiAutomationContext = createContext<AntiAutomationContextType | null>(null);

export const useAntiAutomation = () => {
    const context = useContext(AntiAutomationContext);
    if (!context) throw new Error("useAntiAutomation must be used within an AntiAutomationProvider");
    return context;
};

export const AntiAutomationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
    const [botDetected, setBotDetected] = useState(false);

    // Bot detection state
    const tapHistory = useRef<{ timestamp: number; x: number; y: number }[]>([]);

    useEffect(() => {
        const checkAccessibility = async () => {
            const enabled = await AccessibilityInfo.isScreenReaderEnabled();
            setIsScreenReaderEnabled(enabled);
        };
        
        checkAccessibility();
        const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setIsScreenReaderEnabled);
        
        return () => {
            subscription.remove();
        };
    }, []);

    // Global Touch Interceptor for Click Velocity & Repetition
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: (evt) => {
                const now = Date.now();
                const { pageX, pageY } = evt.nativeEvent;
                
                tapHistory.current.push({ timestamp: now, x: pageX, y: pageY });
                
                // Keep only the last 50 taps
                if (tapHistory.current.length > 50) {
                    tapHistory.current.shift();
                }

                analyzeTouchPatterns();
                return false; // Don't block the touch event, just observe it
            },
        })
    ).current;

    const analyzeTouchPatterns = () => {
        if (tapHistory.current.length < 50) return;

        let identicalClicks = 0;
        let identicalIntervals = 0;

        for (let i = 1; i < tapHistory.current.length; i++) {
            const prev = tapHistory.current[i - 1];
            const curr = tapHistory.current[i];

            // Same exact X, Y coordinate (floating point match usually means scripted)
            if (Math.abs(curr.x - prev.x) < 1 && Math.abs(curr.y - prev.y) < 1) {
                identicalClicks++;
            }

            // Exactly the same time interval between clicks (e.g. 500ms, 500ms, 500ms)
            if (i > 1) {
                const prevInterval = tapHistory.current[i - 1].timestamp - tapHistory.current[i - 2].timestamp;
                const currInterval = curr.timestamp - prev.timestamp;
                
                if (Math.abs(currInterval - prevInterval) < 10) { // Variance < 10ms
                    identicalIntervals++;
                }
            }
        }

        // If 50 clicks are perfectly identical in coordinate AND timing variance is zero
        if (identicalClicks >= 49 && identicalIntervals >= 48) {
            console.warn("🤖 [ANTI-AUTOMATION] Bot click pattern detected!");
            setBotDetected(true);
            
            // In a real app, send a telemetry signal to the backend to increase Risk Score +40
        }
    };

    // Impossible Speed Validator
    const validateModuleSpeed = (moduleId: string, expectedMinimumSeconds: number, actualTimeSeconds: number) => {
        if (actualTimeSeconds < (expectedMinimumSeconds * 0.1)) {
            // E.g. Completed a 20 min video in 1 min
            console.warn(`[ANTI-AUTOMATION] Impossible speed detected on module ${moduleId}. Expected >${expectedMinimumSeconds * 0.1}s, took ${actualTimeSeconds}s`);
            
            // Trigger local block or backend flag
            setBotDetected(true);
            return false;
        }
        return true;
    };

    return (
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
            <AntiAutomationContext.Provider value={{ isScreenReaderEnabled, botDetected, validateModuleSpeed }}>
                {children}
            </AntiAutomationContext.Provider>
        </View>
    );
};
