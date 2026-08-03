export interface UserProgress {
  userId: string;
  name: string;
  avatarUrl?: string;
  streakDays: number;
  streakActiveToday: boolean;
  modulesCompleted: number;
  testsPassed: number;
  averageScorePercent: number;
  
  overallProgressPercent: number;
  learningHoursThisWeek: number;
  
  skillGrowth: Record<string, number>; // e.g., { "React Native": 90, "TypeScript": 60 }
}

export interface ModuleProgress {
  moduleId: string;
  completedLessons: number;
  totalLessons: number;
  lessonCompletionPercentage: number;
  assessmentScore: number;
  unlocked: boolean;
}

export interface LearningActivity {
  id: string;
  date: string; // ISO string or relative like "Today", "Yesterday"
  title: string;
  type: 'quiz_completed' | 'video_watched' | 'badge_earned' | 'certificate_earned';
  score?: number;
}
