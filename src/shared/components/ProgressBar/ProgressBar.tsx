/**
 * Learning Module SDK - ProgressBar Component
 *
 * Height: 8px, Radius: 999px, Fill: #2563EB
 * Animated fill transition.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@shared/theme/colors';
import { borderRadius, layout } from '@shared/theme/spacing';

export interface ProgressBarProps {
  percentage: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color = colors.primary,
  trackColor = colors.primaryLight,
  height = layout.progressBarHeight,
  style,
  animated = true,
}) => {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedPercentage,
        duration: 800, // Slower, smoother fill
        useNativeDriver: false,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          })
        ])
      ).start();
    } else {
      animatedWidth.setValue(clampedPercentage);
    }
  }, [clampedPercentage, animated, animatedWidth, pulseAnim]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const shadowOpacityInterpolation = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.6],
  });

  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.track, { height, backgroundColor: trackColor }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clampedPercentage }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              backgroundColor: color,
              width: widthInterpolation,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: shadowOpacityInterpolation,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          {/* Glowing dot at the end of the progress bar */}
          <Animated.View 
            style={[
              styles.glowDot, 
              { 
                backgroundColor: '#FFFFFF', 
                height: height * 2,
                width: height * 2,
                borderRadius: height,
                shadowColor: color,
                transform: [{ scale: glowScale }]
              }
            ]} 
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    borderRadius: borderRadius.full,
    // Removed overflow: hidden so the glow can escape
  },
  fill: {
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  glowDot: {
    position: 'absolute',
    right: -4, // Offset to sit right at the edge
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  }
});
