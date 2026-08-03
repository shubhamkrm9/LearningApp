/**
 * Learning Module SDK - Assessment API
 *
 * GET /assessments/:assessmentId — Fetch assessment questions
 * POST /assessments/submit — Submit assessment answers
 */

import { baseApi } from './baseApi';
import type {
  Assessment,
  AssessmentSubmission,
  AssessmentResult,
} from '@shared/types/assessment';

import assessmentsMock from '@data/mocks/assessments.json';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export const assessmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssessment: builder.query<Assessment, string>({
      queryFn: async (assessmentId) => {
        await delay(500);
        const detail = (assessmentsMock as any)[assessmentId];
        if (!detail) {
          return { error: { status: 404, data: 'Not found' } };
        }
        return { data: detail.data as Assessment };
      },
      providesTags: (_result, _error, assessmentId) => [
        { type: 'Assessment', id: assessmentId },
      ],
    }),
    submitAssessment: builder.mutation<
      AssessmentResult,
      AssessmentSubmission
    >({
      queryFn: async (body) => {
        await delay(500);
        
        const detail = (assessmentsMock as any)[body.assessmentId];
        if (!detail) {
          return { error: { status: 404, data: 'Not found' } };
        }
        
        const questions = detail.data.questions;
        const passingPercentage = detail.data.passingPercentage || 75;
        
        let correctCount = 0;
        
        body.answers.forEach(answer => {
          const question = questions.find((q: any) => q.id === answer.questionId);
          if (question) {
            const correctAnswers = question.correctAnswers || [];
            
            // Check if selected answers exactly match correct answers
            const isCorrect = 
              answer.selectedAnswers.length === correctAnswers.length &&
              answer.selectedAnswers.every(a => correctAnswers.includes(a));
              
            if (isCorrect) {
              correctCount++;
            }
          }
        });
        
        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= passingPercentage;

        return {
          data: {
            score,
            passed,
            minimumRequired: passingPercentage,
          },
        };
      },
      invalidatesTags: ['Assessment'],
    }),
  }),
});

export const { useGetAssessmentQuery, useSubmitAssessmentMutation } =
  assessmentApi;
