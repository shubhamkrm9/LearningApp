/**
 * Learning Module SDK - ErrorState Component
 *
 * Displays error messages with retry capability.
 * Supports: Network Error, Server Error, Session Expired.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';
import { Button } from '../Button/Button';

export type ErrorType = 'network' | 'server' | 'unauthorized';

export interface ErrorStateProps {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; message: string; action: string }> = {
  network: {
    icon: '📡',
    message: 'No Internet Connection',
    action: 'Retry',
  },
  server: {
    icon: '⚠️',
    message: 'Something Went Wrong',
    action: 'Try Again',
  },
  unauthorized: {
    icon: '🔒',
    message: 'Session Expired',
    action: 'Login Again',
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'server',
  message,
  onRetry,
  retryLabel,
}) => {
  const config = ERROR_CONFIG[type];

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.title}>{message ?? config.message}</Text>
      {onRetry && (
        <Button
          title={retryLabel ?? config.action}
          onPress={onRetry}
          variant="primary"
          style={styles.button}
        />
      )}
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
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});
