import type { UserProgress, LearningActivity } from '@shared/types/models';

export const mockUserProgress: UserProgress = {
  userId: 'u1',
  name: 'Mourya',
  streakDays: 7,
  streakActiveToday: true,
  modulesCompleted: 10,
  testsPassed: 8,
  averageScorePercent: 82,
  overallProgressPercent: 72,
  learningHoursThisWeek: 8.5,
  skillGrowth: {
    'React Native': 90,
    'Redux': 75,
    'TypeScript': 60,
    'Testing': 40,
  }
};

export const mockRecentActivities: LearningActivity[] = [
  {
    id: 'a1',
    date: 'Today, 10:30 AM',
    title: 'Completed Quiz: React Components',
    type: 'quiz_completed',
    score: 90
  },
  {
    id: 'a2',
    date: 'Yesterday',
    title: 'Finished Video: State Management 101',
    type: 'video_watched',
  },
  {
    id: 'a3',
    date: '2 Days Ago',
    title: 'Earned Badge: Quick Learner',
    type: 'badge_earned',
  }
];
