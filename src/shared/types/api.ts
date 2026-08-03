/**
 * Learning Module SDK - API Response Types
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
}

export interface ProgressUpdateRequest {
  moduleId: string;
  videoId: string;
  watchedPercentage: number;
}

export interface ProgressUpdateResponse {
  saved: boolean;
}

export interface ModuleCompleteRequest {
  moduleId: string;
}

export interface ModuleCompleteResponse {
  moduleCompleted: boolean;
  nextModuleUnlocked: boolean;
}
