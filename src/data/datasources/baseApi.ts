/**
 * Learning Module SDK - Base API
 *
 * Single RTK Query API configuration.
 * Dynamic baseUrl from SDK config.
 * Authorization header injection.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@app/store';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.sdk.accessToken;
      const baseUrl = state.sdk.baseUrl;

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');

      // Dynamically set base URL by modifying the request
      if (baseUrl) {
        headers.set('X-Base-URL', baseUrl);
      }

      return headers;
    },
  }),
  tagTypes: ['Modules', 'Progress', 'Assessment', 'Certificate'],
  endpoints: () => ({}),
});
