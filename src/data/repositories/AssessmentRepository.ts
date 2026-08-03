import type { Assessment, AssessmentResult } from '@shared/types/models';
import type { IAssessmentDataSource } from '../datasources/IAssessmentDataSource';
import { MockAssessmentDataSource } from '../datasources/MockAssessmentDataSource';
import { ApiAssessmentDataSource } from '../datasources/ApiAssessmentDataSource';

// Switch this to ApiAssessmentDataSource when backend is ready
const activeDataSource: IAssessmentDataSource = new MockAssessmentDataSource();

export class AssessmentRepository {
  static async getAssessments(): Promise<Assessment[]> {
    return activeDataSource.getAssessments();
  }

  static async getAssessmentById(id: string): Promise<Assessment | null> {
    return activeDataSource.getAssessmentById(id);
  }

  static async getAssessmentForVideo(videoId: string): Promise<Assessment | null> {
    try {
      return await activeDataSource.getAssessmentForVideo(videoId);
    } catch (e) {
      console.log('[AssessmentRepo] DataSource failed, falling back to Mock');
      return new MockAssessmentDataSource().getAssessmentForVideo(videoId);
    }
  }

  static async submitAssessment(
    videoId: string,
    assessmentId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult> {
    try {
      return await activeDataSource.submitAssessment(videoId, assessmentId, answers);
    } catch (e) {
      console.log('[AssessmentRepo] DataSource failed, grading locally');
      return new MockAssessmentDataSource().submitAssessment(videoId, assessmentId, answers);
    }
  }

  static async getScoreBySubmissionId(
    submissionId: string | number,
    assessmentId: string,
    videoId: string
  ): Promise<AssessmentResult | null> {
    try {
      return await activeDataSource.getScoreBySubmissionId(submissionId, assessmentId, videoId);
    } catch (e) {
      return new MockAssessmentDataSource().getScoreBySubmissionId(submissionId, assessmentId, videoId);
    }
  }

  static async getPastResults(): Promise<AssessmentResult[]> {
    return activeDataSource.getPastResults();
  }
}
