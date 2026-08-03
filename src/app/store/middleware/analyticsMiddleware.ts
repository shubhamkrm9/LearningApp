/**
 * Learning Module SDK - Analytics Middleware
 *
 * Intercepts Redux actions and maps them to analytics events.
 * Flow: Redux Action → Middleware → Analytics Service → Backend
 */

import type { Middleware } from '@reduxjs/toolkit';
import { AnalyticsEvents } from '@shared/utils';
import type { AnalyticsPayload } from '@shared/types/analytics';

// Action type constants to match against
const ACTION_EVENT_MAP: Record<string, AnalyticsEvents> = {
  'sdk/initializeSDK': AnalyticsEvents.SDK_INITIALIZED,
  'sdk/launchSDK': AnalyticsEvents.SDK_LAUNCHED,
  'module/setSelectedModule': AnalyticsEvents.MODULE_STARTED,
  'progress/markModuleCompleted': AnalyticsEvents.MODULE_COMPLETED,
  'assessment/setAssessment': AnalyticsEvents.ASSESSMENT_STARTED,
  'assessment/setAssessmentResult': AnalyticsEvents.ASSESSMENT_SUBMITTED,
  'certificate/setCertificate': AnalyticsEvents.CERTIFICATE_VIEWED,
};

// Analytics event queue — in production this would be sent to backend
const eventQueue: AnalyticsPayload[] = [];

export const getAnalyticsQueue = (): readonly AnalyticsPayload[] => eventQueue;

export const clearAnalyticsQueue = (): void => {
  eventQueue.length = 0;
};

export const analyticsMiddleware: Middleware = (_store) => (next) => (action) => {
  const result = next(action);

  const typedAction = action as { type: string; payload?: Record<string, unknown> };
  const eventName = ACTION_EVENT_MAP[typedAction.type];

  if (eventName) {
    const payload: AnalyticsPayload = {
      eventName,
      timestamp: new Date().toISOString(),
      moduleId: typedAction.payload?.moduleId as string | undefined,
      assessmentId: typedAction.payload?.assessmentId as string | undefined,
    };

    eventQueue.push(payload);

    // In development, log analytics events
    if (__DEV__) {
      console.log('[Analytics]', eventName, payload);
    }
  }

  return result;
};
