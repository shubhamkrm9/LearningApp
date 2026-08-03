/**
 * Learning Module SDK - Type Exports
 */

export type { Module, VideoLesson, ModuleDetail, AssessmentInfo } from './module';
export type {
  Assessment,
  Question,
  QuestionType,
  AssessmentResult,
  AnswerPayload,
  AssessmentSubmission,
} from './assessment';
export type { Certificate, CertificateResponse } from './certificate';
export type {
  ApiResponse,
  ApiError,
  ProgressUpdateRequest,
  ProgressUpdateResponse,
  ModuleCompleteRequest,
  ModuleCompleteResponse,
} from './api';
export type { AnalyticsEventName, AnalyticsPayload } from './analytics';
export type {
  RootStackParamList,
  DashboardScreenProps,
  ModuleDetailScreenProps,
  VideoPlayerScreenProps,
  AssessmentScreenProps,
  AssessmentResultScreenProps,
  ModuleCompletionScreenProps,
  CertificateScreenProps,
} from './navigation';
