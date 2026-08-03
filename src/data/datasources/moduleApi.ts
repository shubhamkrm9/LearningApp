/**
 * Learning Module SDK - Module API
 *
 * GET /modules — Fetch all modules
 * GET /modules/:moduleId — Fetch module details
 */

import { baseApi } from './baseApi';
import type { Module, ModuleDetail } from '@shared/types/module';

import modulesMock from '@data/mocks/modules.json';
import moduleDetailsMock from '@data/mocks/moduleDetails.json';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export const moduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getModules: builder.query<Module[], void>({
      queryFn: async (_body) => {
        return { data: modulesMock.data as Module[] };
      },
      providesTags: ['Modules'],
    }),
    getModuleDetails: builder.query<ModuleDetail, string>({
      queryFn: async (moduleId) => {
        const detail = (moduleDetailsMock as any)[moduleId];
        if (!detail) {
          return { error: { status: 404, data: 'Not found' } };
        }
        return { data: detail.data as ModuleDetail };
      },
      providesTags: (_result, _error, moduleId) => [
        { type: 'Modules', id: moduleId },
      ],
    }),
  }),
});

export const { useGetModulesQuery, useGetModuleDetailsQuery } = moduleApi;
