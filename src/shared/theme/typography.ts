import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export const typography = {
  h1: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h2: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  title: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  headingMedium: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  headingLarge: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
};
