/**
 * Learning Module SDK - Constants
 *
 * Central configuration values for the SDK.
 * All business rules are defined here for easy maintenance.
 */

// ─── Assessment ───────────────────────────────────────────
export const PASSING_SCORE = 75;

// ─── Video ────────────────────────────────────────────────
export const VIDEO_COMPLETION_THRESHOLD = 100;
export const PROGRESS_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

// ─── Module Status ────────────────────────────────────────
export enum ModuleStatus {
  LOCKED = 'LOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// ─── Assessment Status ────────────────────────────────────
export enum AssessmentStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

// ─── Question Type ────────────────────────────────────────
export enum QuestionTypeEnum {
  SCQ = 'SCQ',
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
}

// ─── Analytics Events ─────────────────────────────────────
export enum AnalyticsEvents {
  SDK_INITIALIZED = 'SDK_INITIALIZED',
  SDK_LAUNCHED = 'SDK_LAUNCHED',
  MODULE_STARTED = 'MODULE_STARTED',
  MODULE_COMPLETED = 'MODULE_COMPLETED',
  ASSESSMENT_STARTED = 'ASSESSMENT_STARTED',
  ASSESSMENT_SUBMITTED = 'ASSESSMENT_SUBMITTED',
  CERTIFICATE_VIEWED = 'CERTIFICATE_VIEWED',
}

// ─── API Endpoints ────────────────────────────────────────
// See src/api/ApiConfig.ts for all endpoint URLs.

// ─── Error Messages ───────────────────────────────────────
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'No Internet Connection',
  SERVER_ERROR: 'Something Went Wrong',
  SESSION_EXPIRED: 'Session Expired',
  EMPTY_MODULES: 'No Modules Available',
} as const;

// ─── Animation ────────────────────────────────────────────
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 300,
} as const;
