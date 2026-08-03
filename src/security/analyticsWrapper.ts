/**
 * Analytics Wrapper (Stub for Phase 5)
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  // TODO: Send to Firebase Analytics or similar
  console.log(`[Analytics] ${eventName}`, params);
};
