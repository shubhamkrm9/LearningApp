/**
 * Learning Module SDK - API Configuration
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SINGLE FILE to change when backend endpoints or response   ║
 * ║  formats change. All endpoint URLs and response transformers ║
 * ║  live here. No other files need modification.               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { Lesson, ModuleSection } from '@shared/types/models';
import type { Assessment, AssessmentResult } from '@shared/types/models';

// ─── Endpoint URLs ──────────────────────────────────────────
// Change these strings when your backend URLs change.
// The baseUrl from SDKConfig is prepended automatically by ApiService.

export const API_URLS = {
  /** GET - List all videos */
  VIDEOS_LIST: '/api/videos/',

  /** GET - Get video details by ID */
  VIDEO_DETAIL: (id: string | number) => `/api/process/${id}/`,

  /** GET - HLS video stream URL (used directly by react-native-video) */
  VIDEO_STREAM: (id: string | number) => `/api/video/${id}/playlist.m3u8`,

  /** GET - Fetch assessment questions for a video */
  ASSESSMENT_GET: (videoId: string | number) => `/api/video/${videoId}/questions/`,

  /** POST - Submit assessment answers for a video */
  ASSESSMENT_SUBMIT: (videoId: string | number) => `/api/video/${videoId}/submit/`,

  /** GET - Fetch assessment score by submission ID */
  ASSESSMENT_SCORE: (submissionId: string | number) => `/api/assessment/${submissionId}/score/`,
};

// ─── Assumed Backend Response Types ─────────────────────────
// These represent the RAW shapes your Django backend returns.
// Update these interfaces when the backend contract is finalized.

export interface ApiVideo {
  id: number;
  title: string;
  description?: string;
  duration?: number; // in seconds
  thumbnail?: string;
  order?: number;
}

export interface ApiChoice {
  id: number;
  text: string;
}

export interface ApiQuestion {
  id: number;
  text: string;
  choices: ApiChoice[];
}

/**
 * NOTE: The backend returns ApiQuestion[] directly (flat array),
 * NOT wrapped in an ApiAssessment object.
 * The transformer builds the Assessment from videoId + questions.
 */

export interface ApiAssessmentScoreResult {
  id: number;
  video: number;
  score: number;           // raw correct count (e.g. 3 out of 4)
  total_questions: number;
  created_at: string;      // ISO timestamp
}

// ─── Transformers ───────────────────────────────────────────
// Convert backend response → app internal types.
// When backend format changes, update ONLY these functions.

/**
 * Transform a list of videos from GET /api/videos/ into Lesson objects.
 */
export function transformVideoListToLessons(
  videos: ApiVideo[],
  moduleId: string = 'm1',
): Lesson[] {
  return videos.map((v, index) => ({
    id: String(v.id),
    moduleId,
    title: v.title,
    durationString: v.duration ? formatDuration(v.duration) : 'Video',
    videoUrl: '', // Constructed at playback via API_URLS.VIDEO_STREAM
    type: 'video' as const,
    status: 'AVAILABLE' as const,
    order: v.order ?? index + 1,
    description: v.description || '',
    assessmentId: `a-${v.id}`,
    watchedPercent: 0,
  }));
}

/**
 * Transform video list into a single section for display.
 */
export function transformVideoListToSections(
  videos: ApiVideo[],
  moduleId: string = 'm1',
): ModuleSection[] {
  const lessons = transformVideoListToLessons(videos, moduleId);
  return [
    {
      id: 'sec-main',
      moduleId,
      title: 'Course Videos',
      order: 1,
      status: 'AVAILABLE' as const,
      lessons,
    },
  ];
}

/**
 * Transform backend questions array into app Assessment type.
 * The backend returns a flat ApiQuestion[] for GET /api/video/{id}/questions/
 */
export function transformQuestionsToAssessment(
  videoId: string,
  apiQuestions: ApiQuestion[],
): Assessment {
  const assessmentId = `a-${videoId}`;
  return {
    id: assessmentId,
    videoId: String(videoId),
    title: 'Assessment',
    totalQuestions: apiQuestions.length,
    durationMinutes: Math.ceil(apiQuestions.length * 2),
    passingScorePercent: 70,
    questions: apiQuestions.map((q) => ({
      id: String(q.id),
      assessmentId,
      text: q.text,
      choices: q.choices.map((c) => ({
        id: String(c.id),
        text: c.text,
      })),
    })),
  };
}

/**
 * Transform backend score response into app AssessmentResult type.
 * Backend returns: { id, video, score, total_questions, created_at }
 * where `score` is the raw count of correct answers (not a percentage).
 */
export function transformScoreResult(
  apiResult: ApiAssessmentScoreResult,
  assessmentId: string,
  videoId: string,
): AssessmentResult {
  const total = apiResult.total_questions;
  const correct = apiResult.score;
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return {
    assessmentId,
    videoId,
    scorePercent,
    isPass: scorePercent >= 70,
    correctCount: correct,
    incorrectCount: total - correct,
    totalQuestions: total,
    topicBreakdown: { General: scorePercent },
  };
}

// ─── Helpers ────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min video`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
