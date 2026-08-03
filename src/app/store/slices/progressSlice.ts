import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ModuleProgress, LearningActivity } from '@shared/types/models';

export interface ProgressState {
  currentModuleId: string | null;
  currentVideoId: string | null;
  watchedPercentage: number;
  completedLessons: string[]; // lesson ids
  moduleProgress: Record<string, ModuleProgress>;
  activities: LearningActivity[];
  streakDays: number;
  lastActiveDate: string | null;
  learningHours: number;
  /** Lesson/video IDs whose assessments have been unlocked (80% watched) */
  unlockedAssessments: string[];
  /** Video watch progress: lessonId → percentage (0-100) */
  videoWatchPercent: Record<string, number>;
}

const initialState: ProgressState = {
  currentModuleId: null,
  currentVideoId: null,
  watchedPercentage: 0,
  completedLessons: [],
  moduleProgress: {},
  activities: [],
  streakDays: 0,
  lastActiveDate: null,
  learningHours: 0,
  unlockedAssessments: [],
  videoWatchPercent: {},
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    setCurrentVideo(
      state,
      action: PayloadAction<{ moduleId: string; videoId: string }>,
    ) {
      state.currentModuleId = action.payload.moduleId;
      state.currentVideoId = action.payload.videoId;
    },
    updateProgress(state, action: PayloadAction<number>) {
      state.watchedPercentage = action.payload;
    },
    resetLessonProgress(
      state,
      action: PayloadAction<{ moduleId: string; videoId: string }>,
    ) {
      state.watchedPercentage = 0;
      state.videoWatchPercent[action.payload.videoId] = 0;
    },
    /**
     * Track video watch percentage for 80% threshold.
     */
    setVideoWatchPercent(
      state,
      action: PayloadAction<{ lessonId: string; percent: number }>,
    ) {
      state.videoWatchPercent[action.payload.lessonId] = action.payload.percent;
    },
    /**
     * Unlock an assessment when video reaches 80%.
     */
    unlockAssessment(state, action: PayloadAction<string>) {
      if (!state.unlockedAssessments.includes(action.payload)) {
        state.unlockedAssessments.push(action.payload);

        state.activities.unshift({
          id: Date.now().toString(),
          date: 'Just now',
          title: 'Assessment Unlocked! 🎉',
          type: 'quiz_completed',
        });
      }
    },
    markLessonCompleted(
      state,
      action: PayloadAction<{
        lessonId: string;
        moduleId: string;
        title: string;
        totalVideos: number;
      }>,
    ) {
      if (!state.completedLessons.includes(action.payload.lessonId)) {
        state.completedLessons.push(action.payload.lessonId);

        // Add activity
        state.activities.unshift({
          id: Date.now().toString(),
          date: 'Just now',
          title: `Finished Lesson: ${action.payload.title}`,
          type: 'video_watched',
        });

        // Update streak logic
        if (
          !state.lastActiveDate ||
          state.lastActiveDate !== new Date().toDateString()
        ) {
          state.streakDays += 1;
          state.lastActiveDate = new Date().toDateString();
        }

        // Add some dummy time to learning hours
        state.learningHours += 0.5;

        // Update Module Progress
        const modId = action.payload.moduleId;
        if (!state.moduleProgress[modId]) {
          state.moduleProgress[modId] = {
            moduleId: modId,
            completedLessons: 0,
            totalLessons: action.payload.totalVideos || 1,
            lessonCompletionPercentage: 0,
            assessmentScore: 0,
            unlocked: true,
          };
        }
        state.moduleProgress[modId]!.completedLessons += 1;
        state.moduleProgress[modId]!.totalLessons = action.payload.totalVideos || 1; // Update in case it changed
        const mp = state.moduleProgress[modId]!;
        mp.lessonCompletionPercentage = Math.min(
          100,
          Math.round((mp.completedLessons / mp.totalLessons) * 100)
        );
      }
    },
    initializeModuleProgress(
      state,
      action: PayloadAction<{
        moduleId: string;
        totalLessons: number;
        unlocked: boolean;
      }>,
    ) {
      if (!state.moduleProgress[action.payload.moduleId]) {
        state.moduleProgress[action.payload.moduleId] = {
          moduleId: action.payload.moduleId,
          completedLessons: 0,
          totalLessons: action.payload.totalLessons,
          lessonCompletionPercentage: 0,
          assessmentScore: 0,
          unlocked: action.payload.unlocked,
        };
      }
    },
    unlockModule(state, action: PayloadAction<string>) {
      if (state.moduleProgress[action.payload]) {
        state.moduleProgress[action.payload]!.unlocked = true;
      }
    },
    updateModuleAssessmentScore(
      state,
      action: PayloadAction<{ moduleId: string; score: number }>,
    ) {
      if (state.moduleProgress[action.payload.moduleId]) {
        state.moduleProgress[action.payload.moduleId]!.assessmentScore =
          action.payload.score;
      }

      state.activities.unshift({
        id: Date.now().toString(),
        date: 'Just now',
        title: `Completed Assessment with ${action.payload.score}%`,
        type: 'quiz_completed',
      });
    },
    addCertificateActivity(
      state,
      action: PayloadAction<{ title: string }>,
    ) {
      state.activities.unshift({
        id: Date.now().toString(),
        date: 'Just now',
        title: `Earned Certificate: ${action.payload.title}`,
        type: 'certificate_earned',
      });
    },
    markModuleCompleted(state, action: PayloadAction<string>) {
      if (state.moduleProgress[action.payload]) {
        state.moduleProgress[action.payload]!.unlocked = true;
      }
    },
  },
  selectors: {
    selectCurrentVideo: (state) => ({
      moduleId: state.currentModuleId,
      videoId: state.currentVideoId,
    }),
    selectCurrentProgress: (state) => state.watchedPercentage,
    selectCompletedLessons: (state) => state.completedLessons,
    selectModuleProgress: (state) => state.moduleProgress,
    selectActivities: (state) => state.activities,
    selectStreak: (state) => state.streakDays,
    selectLearningHours: (state) => state.learningHours,
    selectUnlockedAssessments: (state) => state.unlockedAssessments,
    selectVideoWatchPercent: (state) => state.videoWatchPercent,
  },
});

export const {
  setCurrentVideo,
  updateProgress,
  resetLessonProgress,
  setVideoWatchPercent,
  unlockAssessment,
  markLessonCompleted,
  initializeModuleProgress,
  unlockModule,
  updateModuleAssessmentScore,
  addCertificateActivity,
  markModuleCompleted,
} = progressSlice.actions;

export const {
  selectCurrentVideo,
  selectCurrentProgress,
  selectCompletedLessons,
  selectModuleProgress,
  selectActivities,
  selectStreak,
  selectLearningHours,
  selectUnlockedAssessments,
  selectVideoWatchPercent,
} = progressSlice.selectors;

export default progressSlice.reducer;
