/**
 * Learning Module SDK - Theme System
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, layout, shadows } from './spacing';

export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  layout: require('./spacing').layout,
  shadows: require('./spacing').shadows,
} as const;
