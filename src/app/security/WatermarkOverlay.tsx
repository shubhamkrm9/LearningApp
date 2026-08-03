import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface WatermarkProps {
    userEmail: string;
    courseId: string;
}

export const WatermarkOverlay: React.FC<WatermarkProps> = ({ userEmail, courseId }) => {
    const { width, height } = Dimensions.get('window');
    
    // We render multiple diagonal watermarks across the screen
    const watermarks = Array.from({ length: 6 }).map((_, index) => (
        <View 
            key={index} 
            style={[
                styles.watermarkContainer, 
                { top: (height / 6) * index, left: (width / 4) * (index % 2) }
            ]}
        >
            <Text style={styles.watermarkText}>{userEmail}</Text>
            <Text style={styles.watermarkText}>{courseId}</Text>
            <Text style={styles.watermarkText}>{new Date().toISOString()}</Text>
        </View>
    ));

    return (
        <View style={styles.overlayContainer} pointerEvents="none">
            {watermarks}
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100, // Make sure this is above the video player but below the warning overlays
        opacity: 0.15, // Barely visible to not disturb learning, but highly visible in forensic analysis
    },
    watermarkContainer: {
        position: 'absolute',
        transform: [{ rotate: '-30deg' }],
    },
    watermarkText: {
        color: 'white', // Alternatively, a dynamic color based on video background
        fontSize: 12,
        fontWeight: 'bold',
        textShadowColor: 'black',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    }
});
