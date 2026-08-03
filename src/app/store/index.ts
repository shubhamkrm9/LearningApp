/**
 * Learning Module SDK - Redux Store
 *
 * Centralized state management with all slices,
 * RTK Query middleware, and analytics middleware.
 */

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import sdkReducer from './slices/sdkSlice';
import authReducer from './slices/authSlice';
import moduleReducer from './slices/moduleSlice';
import progressReducer from './slices/progressSlice';
import assessmentReducer from './slices/assessmentSlice';
import certificateReducer from './slices/certificateSlice';
import { baseApi } from '@data/datasources/baseApi';
import { analyticsMiddleware } from './middleware/analyticsMiddleware';

export const createSDKStore = () =>
  configureStore({
    reducer: {
      sdk: sdkReducer,
      auth: authReducer,
      module: moduleReducer,
      progress: progressReducer,
      assessment: assessmentReducer,
      certificate: certificateReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore non-serializable values in RTK Query actions
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      })
        .concat(baseApi.middleware)
        .concat(analyticsMiddleware),
  });

export type SDKStore = ReturnType<typeof createSDKStore>;
export type RootState = ReturnType<SDKStore['getState']>;
export type AppDispatch = SDKStore['dispatch'];

// Typed hooks
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
