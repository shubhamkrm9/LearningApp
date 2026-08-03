/**
 * Learning Module SDK - Loader Component
 *
 * Centered spinner for loading states.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface LoaderProps {
  message?: string;
  size?: 'small' | 'large';
}

export const Loader: React.FC<LoaderProps> = ({
  message,
  size = 'large',
}) => {
  return (
    <View style={styles.container} accessibilityRole="none" accessibilityLabel="Loading">
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.base,
    textAlign: 'center',
  },
});
