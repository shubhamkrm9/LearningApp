import type { IProgressDataSource } from './IProgressDataSource';
import type { UserProgress, LearningActivity } from '@shared/types/models';
import { ApiService } from './ApiService';
import { API_URLS } from './ApiConfig';

export class ApiProgressDataSource implements IProgressDataSource {
  async getUserProgress(): Promise<UserProgress> {
    const progress = await ApiService.get<UserProgress>('/api/progress/summary');
    if (progress) {
      return progress;
    }
    throw new Error('Failed to get user progress from API');
  }

  async getRecentActivities(): Promise<LearningActivity[]> {
    const activities = await ApiService.get<LearningActivity[]>('/api/progress/activities');
    if (activities) {
      return activities;
    }
    return [];
  }
}
