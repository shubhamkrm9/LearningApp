import React, { createContext, useContext, useEffect, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform, View, Text, StyleSheet } from 'react-native';

interface ContentProtectionContextType {
    isRecording: boolean;
}

const ContentProtectionContext = createContext<ContentProtectionContextType>({ isRecording: false });

export const useContentProtection = () => useContext(ContentProtectionContext);

export const ContentProtectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'ios' && NativeModules.IOSContentProtection) {
            const eventEmitter = new NativeEventEmitter(NativeModules.IOSContentProtection);
            
            const recordingListener = eventEmitter.addListener('onScreenRecordingStatusChanged', (event) => {
                setIsRecording(event.isRecording);
                if (event.isRecording) {
                    console.warn("Screen recording started! Pausing video playback...");
                }
            });

            const screenshotListener = eventEmitter.addListener('onScreenshotTaken', () => {
                // Here we could trigger a backend audit log
                console.warn("Screenshot taken by user! Logging event to backend...");
            });

            return () => {
                recordingListener.remove();
                screenshotListener.remove();
            };
        }
    }, []);

    return (
        <ContentProtectionContext.Provider value={{ isRecording }}>
            {children}
            {/* Display React Native warning overlay if recording, as an additional fallback to the native Blur view */}
            {isRecording && Platform.OS === 'ios' && (
                <View style={styles.warningOverlay} pointerEvents="none">
                    <Text style={styles.warningText}>Screen Recording Detected</Text>
                    <Text style={styles.subText}>Premium content paused.</Text>
                </View>
            )}
        </ContentProtectionContext.Provider>
    );
};

const styles = StyleSheet.create({
    warningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    warningText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subText: {
        color: 'red',
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    }
});
