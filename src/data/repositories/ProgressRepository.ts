import type { UserProgress, LearningActivity } from '@shared/types/models';
import type { IProgressDataSource } from '../datasources/IProgressDataSource';
import { MockProgressDataSource } from '../datasources/MockProgressDataSource';
import { ApiProgressDataSource } from '../datasources/ApiProgressDataSource';

// Switch this to ApiProgressDataSource when backend is ready
const activeDataSource: IProgressDataSource = new MockProgressDataSource();

export class ProgressRepository {
  static async getUserProgress(): Promise<UserProgress> {
    try {
      return await activeDataSource.getUserProgress();
    } catch (e) {
      console.log('[ProgressRepo] DataSource failed, falling back to Mock');
      return new MockProgressDataSource().getUserProgress();
    }
  }

  static async getRecentActivities(): Promise<LearningActivity[]> {
    try {
      return await activeDataSource.getRecentActivities();
    } catch (e) {
      return new MockProgressDataSource().getRecentActivities();
    }
  }
}
