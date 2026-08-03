/**
 * Learning Module SDK - Analytics Types
 */

export type AnalyticsEventName =
  | 'SDK_INITIALIZED'
  | 'SDK_LAUNCHED'
  | 'MODULE_STARTED'
  | 'MODULE_COMPLETED'
  | 'ASSESSMENT_STARTED'
  | 'ASSESSMENT_SUBMITTED'
  | 'CERTIFICATE_VIEWED';

export interface AnalyticsPayload {
  eventName: AnalyticsEventName;
  moduleId?: string;
  assessmentId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
