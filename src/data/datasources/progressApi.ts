/**
 * Learning Module SDK - Progress API
 *
 * GET /progress — Fetch overall progress (if needed)
 * POST /progress/video — Update video watched percentage
 * POST /modules/complete — Validate and complete module
 */

import { baseApi } from './baseApi';
import type {
  ProgressUpdateRequest,
  ProgressUpdateResponse,
  ModuleCompleteRequest,
  ModuleCompleteResponse,
} from '@shared/types/api';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export const progressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateVideoProgress: builder.mutation<
      ProgressUpdateResponse,
      ProgressUpdateRequest
    >({
      queryFn: async (_body) => {
        await delay(300);
        return { data: { saved: true } };
      },
      invalidatesTags: ['Progress'],
    }),
    completeModule: builder.mutation<
      ModuleCompleteResponse,
      ModuleCompleteRequest
    >({
      queryFn: async (_body) => {
        await delay(500);
        return { data: { moduleCompleted: true, nextModuleUnlocked: true } };
      },
      invalidatesTags: ['Modules', 'Progress', 'Certificate'],
    }),
  }),
});

export const { useUpdateVideoProgressMutation, useCompleteModuleMutation } =
  progressApi;
