import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AssessmentPastResult {
  assessmentId: string;
  score: number;
  passed: boolean;
  attempts: number;
  bestScore: number;
  lastScore: number;
}

export interface AssessmentState {
  currentAssessmentId: string | null;
  answers: Record<string, string[]>;
  score: number;
  isPassed: boolean;
  loading: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  pastResults: Record<string, AssessmentPastResult>;
}

const initialState: AssessmentState = {
  currentAssessmentId: null,
  answers: {},
  score: 0,
  isPassed: false,
  loading: false,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  pastResults: {},
};

const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    setAssessment(state, action: PayloadAction<{ assessmentId: string; totalQuestions: number }>) {
      state.currentAssessmentId = action.payload.assessmentId;
      state.totalQuestions = action.payload.totalQuestions;
      state.answers = {};
      state.score = 0;
      state.isPassed = false;
      state.currentQuestionIndex = 0;
    },
    saveAnswer(state, action: PayloadAction<{ questionId: string; selectedAnswers: string[] }>) {
      state.answers[action.payload.questionId] = action.payload.selectedAnswers;
    },
    setAssessmentResult(state, action: PayloadAction<{ score: number; passed: boolean }>) {
      state.score = action.payload.score;
      state.isPassed = action.payload.passed;
      state.loading = false;

      if (state.currentAssessmentId) {
        const prevResult = state.pastResults[state.currentAssessmentId];
        const attempts = (prevResult?.attempts || 0) + 1;
        const bestScore = Math.max(prevResult?.bestScore || 0, action.payload.score);

        state.pastResults[state.currentAssessmentId] = {
          assessmentId: state.currentAssessmentId,
          score: action.payload.score,
          passed: action.payload.passed,
          attempts,
          bestScore,
          lastScore: action.payload.score,
        };
      }
    },
    setAssessmentLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    nextQuestion(state) {
      if (state.currentQuestionIndex < state.totalQuestions - 1) {
        state.currentQuestionIndex += 1;
      }
    },
    previousQuestion(state) {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex -= 1;
      }
    },
    resetAssessment(state) {
      const pastResults = state.pastResults;
      return { ...initialState, pastResults };
    },
  },
});

export const {
  setAssessment,
  saveAnswer,
  setAssessmentResult,
  setAssessmentLoading,
  nextQuestion,
  previousQuestion,
  resetAssessment,
} = assessmentSlice.actions;

// Explicitly define global selectors so they work with the root state structure in `store/index.ts`
export const selectAssessment = (state: any) => state.assessment;
export const selectAssessmentScore = (state: any) => state.assessment.score;
export const selectAssessmentStatus = (state: any) => state.assessment.isPassed;
export const selectAssessmentLoading = (state: any) => state.assessment.loading;
export const selectCurrentQuestionIndex = (state: any) => state.assessment.currentQuestionIndex;
export const selectAnswers = (state: any) => state.assessment.answers;
export const selectPastResults = (state: any) => state.assessment.pastResults;

export default assessmentSlice.reducer;
