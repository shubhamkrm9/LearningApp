export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  durationString: string;
  videoUrl: string;
  type: 'video' | 'reading' | 'quiz';
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  description: string;
  /** ID of the assessment linked to this lesson/video */
  assessmentId?: string;
  /** How much of the video has been watched (0-100) */
  watchedPercent?: number;
}

export interface ModuleSection {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  lessons: Lesson[];
}
