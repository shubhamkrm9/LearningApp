/**
 * Learning Module SDK - Card Component
 *
 * Container card with white background, shadow, and optional locked state.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@shared/theme/colors';
import { borderRadius, spacing, shadows } from '@shared/theme/spacing';

export interface CardProps {
  children: React.ReactNode;
  locked?: boolean;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  locked = false,
  style,
}) => {
  return (
    <View
      style={[
        styles.card,
        locked && styles.locked,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.base,
    ...shadows.card,
  },
  locked: {
    backgroundColor: colors.lockedBackground,
    opacity: 0.85,
  },
});
