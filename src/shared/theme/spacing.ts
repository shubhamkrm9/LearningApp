import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  s: 8,
  sm: 8,
  m: 16,
  md: 16,
  l: 24,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  base: 16,
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  full: 9999,
};

export const layout = {
  buttonHeight: 48,
  minTouchTarget: 44,
  headerHeight: 56,
  progressBarHeight: 8,
  videoPlayerHeight: 240,
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as Record<string, unknown>,
};
