import type { IAssessmentDataSource } from './IAssessmentDataSource';
import type { Assessment, AssessmentResult } from '@shared/types/models';
import { ApiService } from './ApiService';
import {
  API_URLS,
  transformQuestionsToAssessment,
  transformScoreResult,
  type ApiQuestion,
  type ApiAssessmentScoreResult,
} from './ApiConfig';

export class ApiAssessmentDataSource implements IAssessmentDataSource {
  async getAssessments(): Promise<Assessment[]> {
    throw new Error('API not fully implemented for getAssessments');
  }

  async getAssessmentById(id: string): Promise<Assessment | null> {
    throw new Error('API not fully implemented for getAssessmentById');
  }

  async getAssessmentForVideo(videoId: string): Promise<Assessment | null> {
    const apiQuestions = await ApiService.get<ApiQuestion[]>(API_URLS.ASSESSMENT_GET(videoId));
    if (apiQuestions && apiQuestions.length > 0) {
      return transformQuestionsToAssessment(videoId, apiQuestions);
    }
    return null;
  }

  async submitAssessment(
    videoId: string,
    assessmentId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult> {
    const submission = {
      responses: Object.entries(answers).map(([questionId, choiceId]) => ({
        question_id: parseInt(questionId, 10) || 0,
        choice_id: parseInt(choiceId, 10) || 0,
      })),
    };

    const submitResponse = await ApiService.post<{ id: number } | ApiAssessmentScoreResult>(
      API_URLS.ASSESSMENT_SUBMIT(videoId),
      submission
    );

    if (submitResponse) {
      if ('score' in submitResponse && 'total_questions' in submitResponse) {
        return transformScoreResult(submitResponse as ApiAssessmentScoreResult, assessmentId, videoId);
      }
      const submissionId = (submitResponse as { id: number }).id || 1;
      const scoreResult = await ApiService.get<ApiAssessmentScoreResult>(
        API_URLS.ASSESSMENT_SCORE(submissionId)
      );

      if (scoreResult) {
        return transformScoreResult(scoreResult, assessmentId, videoId);
      }
    }
    throw new Error('Failed to get score from API');
  }

  async getScoreBySubmissionId(
    submissionId: string | number,
    assessmentId: string,
    videoId: string
  ): Promise<AssessmentResult | null> {
    const scoreResult = await ApiService.get<ApiAssessmentScoreResult>(
      API_URLS.ASSESSMENT_SCORE(submissionId)
    );
    if (scoreResult) {
      return transformScoreResult(scoreResult, assessmentId, videoId);
    }
    return null;
  }

  async getPastResults(): Promise<AssessmentResult[]> {
    throw new Error('API not fully implemented for getPastResults');
  }
}
