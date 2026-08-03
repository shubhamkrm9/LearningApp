/**
 * Learning Module SDK - Button Component
 *
 * Primary, Secondary, Disabled variants.
 * Height: 48px, Min touch target: 44×44
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@shared/theme/colors';
import { borderRadius, layout, spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyles = [
    styles.base,
    styles[variant],
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    variant === 'secondary' ? styles.labelSecondary : styles.labelPrimary,
    isDisabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? colors.primary : colors.textInverse}
        />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    minWidth: layout.minTouchTarget,
    borderRadius: borderRadius.small,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.lockedBackground,
    borderColor: colors.border,
  },
  label: {
    ...typography.button,
  },
  labelPrimary: {
    color: colors.textInverse,
  },
  labelSecondary: {
    color: colors.primary,
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
});
