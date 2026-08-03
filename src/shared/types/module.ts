/**
 * Learning Module SDK - Module Domain Models
 */

export interface Module {
  id: string;
  title: string;
  description: string;
  totalVideos: number;
  completedVideos: number;
  completionPercentage: number;
  isLocked: boolean;
  isCompleted: boolean;
  // Enhanced fields for UI
  duration: string;
  lessonsCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnailUrl?: string;
  category?: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  duration: number;
  watchedPercentage: number;
  isCompleted: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface ModuleDetail {
  id: string;
  title: string;
  completionPercentage: number;
  duration?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  videos: VideoLesson[];
  assessment: AssessmentInfo;
}

export interface AssessmentInfo {
  id: string;
  isUnlocked: boolean;
  passingPercentage: number;
}
