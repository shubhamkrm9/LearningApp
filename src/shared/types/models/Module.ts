export interface Module {
  id: string;
  title: string;
  category: string;
  durationString: string;
  totalLessons: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  instructorName: string;
  instructorTitle: string;
  rating: number;
  progressPercent: number; // 0 to 100
  thumbnailUrl: string;
  isNew?: boolean;
  isPopular?: boolean;
  status?: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'CERTIFIED';
  skills: string[];
  prerequisites: string[];
  certificateAvailable: boolean;
}
