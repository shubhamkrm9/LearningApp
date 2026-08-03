import type { Assessment, AssessmentResult } from '@shared/types/models';

export interface IAssessmentDataSource {
  getAssessments(): Promise<Assessment[]>;
  getAssessmentById(id: string): Promise<Assessment | null>;
  getAssessmentForVideo(videoId: string): Promise<Assessment | null>;
  submitAssessment(
    videoId: string,
    assessmentId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult>;
  getScoreBySubmissionId(
    submissionId: string | number,
    assessmentId: string,
    videoId: string
  ): Promise<AssessmentResult | null>;
  getPastResults(): Promise<AssessmentResult[]>;
}
