import type { UserProgress, LearningActivity } from '@shared/types/models';

export interface IProgressDataSource {
  getUserProgress(): Promise<UserProgress>;
  getRecentActivities(): Promise<LearningActivity[]>;
}
