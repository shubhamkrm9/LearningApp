/**
 * Learning Module SDK - EmptyState Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface EmptyStateProps {
  message?: string;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No Modules Available',
  icon = '📚',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
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
  icon: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  message: {
    ...typography.title,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
