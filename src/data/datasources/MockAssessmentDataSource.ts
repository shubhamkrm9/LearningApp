import type { IAssessmentDataSource } from './IAssessmentDataSource';
import type { Assessment, AssessmentResult } from '@shared/types/models';
import { mockAssessments, mockResults, correctAnswers } from '@data/mocks/mockAssessments';

export class MockAssessmentDataSource implements IAssessmentDataSource {
  async getAssessments(): Promise<Assessment[]> {
    return Promise.resolve(mockAssessments);
  }

  async getAssessmentById(id: string): Promise<Assessment | null> {
    const assessment = mockAssessments.find((a) => a.id === id);
    return Promise.resolve(assessment || null);
  }

  async getAssessmentForVideo(videoId: string): Promise<Assessment | null> {
    const mock = mockAssessments.find((a) => a.videoId === videoId);
    return Promise.resolve(mock || null);
  }

  async submitAssessment(
    videoId: string,
    assessmentId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResult> {
    const assessment = mockAssessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('Assessment not found');

    let correctCount = 0;
    assessment.questions.forEach((q) => {
      const userChoiceId = answers[q.id];
      const correctChoiceId = correctAnswers[q.id];
      if (userChoiceId === correctChoiceId) {
        correctCount++;
      }
    });

    const total = assessment.questions.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isPass = scorePercent >= assessment.passingScorePercent;

    const result: AssessmentResult = {
      assessmentId,
      videoId,
      scorePercent,
      isPass,
      correctCount,
      incorrectCount: total - correctCount,
      totalQuestions: total,
      topicBreakdown: { General: scorePercent },
    };

    mockResults[assessmentId] = result;
    return Promise.resolve(result);
  }

  async getScoreBySubmissionId(
    submissionId: string | number,
    assessmentId: string,
    videoId: string
  ): Promise<AssessmentResult | null> {
    return Promise.resolve(mockResults[assessmentId] || null);
  }

  async getPastResults(): Promise<AssessmentResult[]> {
    return Promise.resolve(Object.values(mockResults));
  }
}
