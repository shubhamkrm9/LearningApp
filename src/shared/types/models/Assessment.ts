export interface Choice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  assessmentId: string;
  text: string;
  /** Structured choices with IDs — used for submission */
  choices: Choice[];
}

export interface Assessment {
  id: string;
  /** Which video/lesson this assessment belongs to */
  videoId: string;
  moduleId?: string;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  passingScorePercent: number;
  questions: Question[];
}

/**
 * Submission format matching backend expectation:
 * POST { responses: [{ question_id: number, choice_id: number }] }
 */
export interface UserSubmission {
  videoId: string;
  responses: Array<{
    question_id: number;
    choice_id: number;
  }>;
}

export interface AssessmentResult {
  assessmentId: string;
  videoId?: string;
  scorePercent: number;
  isPass: boolean;
  correctCount: number;
  incorrectCount: number;
  totalQuestions?: number;
  topicBreakdown: Record<string, number>;
  attempts?: number;
  bestScore?: number;
  lastScore?: number;
}
