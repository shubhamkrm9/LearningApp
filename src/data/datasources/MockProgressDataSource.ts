import type { IProgressDataSource } from './IProgressDataSource';
import type { UserProgress, LearningActivity } from '@shared/types/models';
import { mockUserProgress, mockRecentActivities } from '@data/mocks/mockProgress';

export class MockProgressDataSource implements IProgressDataSource {
  async getUserProgress(): Promise<UserProgress> {
    return Promise.resolve(mockUserProgress);
  }

  async getRecentActivities(): Promise<LearningActivity[]> {
    return Promise.resolve(mockRecentActivities);
  }
}
