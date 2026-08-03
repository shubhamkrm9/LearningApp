import { useMemo } from 'react';
import { useGetModulesQuery } from '@data/datasources/moduleApi';
import { useAppSelector } from '@app/store';
import { selectModuleProgress } from '@app/store/slices/progressSlice';
import type { Module } from '@shared/types/module';

// Map module IDs to our new custom thumbnail images
export const MODULE_IMAGES: Record<string, any> = {
  'module_1': require('../assets/images/react-native.png'),
  'module_2': require('../assets/images/redux.png'),
  'module_3': require('../assets/images/typescript.png'),
};

export const useDynamicModules = () => {
  const { data: baseModules, isLoading, error, refetch } = useGetModulesQuery();
  const moduleProgress = useAppSelector(selectModuleProgress);

  const dynamicModules = useMemo(() => {
    if (!baseModules) return undefined;

    return baseModules.map((module, index) => {
      // 1. Evaluate lock status sequentially
      // Module 0 is always unlocked. Module N unlocks when Module N-1 is 100% complete with >=75% assessment score.
      let isLocked = false;
      if (index > 0) {
        const prevModule = baseModules[index - 1];
        const prevProgress = moduleProgress[prevModule.id];
        
        const prevCompleted = prevProgress 
          ? (prevProgress.lessonCompletionPercentage === 100 && prevProgress.assessmentScore >= 75)
          : false;

        isLocked = !prevCompleted;
      }

      // 2. Override completion percentage with real dynamic state
      const currentProgress = moduleProgress[module.id];
      const completionPercentage = currentProgress 
        ? currentProgress.lessonCompletionPercentage 
        : 0;

      // 3. Mark as fully completed if videos are 100% and assessment >= 75%
      const isCompleted = currentProgress 
        ? (currentProgress.lessonCompletionPercentage === 100 && currentProgress.assessmentScore >= 75)
        : false;

      return {
        ...module,
        isLocked,
        isCompleted,
        completionPercentage,
      };
    });
  }, [baseModules, moduleProgress]);

  return {
    modules: dynamicModules,
    isLoading,
    error,
    refetch,
  };
};
