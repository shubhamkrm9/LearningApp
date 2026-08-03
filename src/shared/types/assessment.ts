/**
 * Learning Module SDK - Assessment Domain Models
 */

export interface Assessment {
  id: string;
  moduleId: string;
  passingPercentage: number;
  totalQuestions: number;
  isUnlocked: boolean;
  isPassed: boolean;
  questions: Question[];
}

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  correctAnswers: string[];
}

export type QuestionType = 'SCQ' | 'MCQ' | 'TRUE_FALSE';

export interface AssessmentResult {
  score: number;
  passed: boolean;
  minimumRequired: number;
}

export interface AnswerPayload {
  questionId: string;
  selectedAnswers: string[];
}

export interface AssessmentSubmission {
  assessmentId: string;
  answers: AnswerPayload[];
}
