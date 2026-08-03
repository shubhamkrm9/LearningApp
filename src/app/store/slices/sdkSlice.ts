/**
 * Learning Module SDK - SDK Slice
 *
 * Manages SDK configuration and lifecycle state.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SDKState {
  initialized: boolean;
  baseUrl: string;
  accessToken: string;
  launchTime: string | null;
  sdkVersion: string;
}

const initialState: SDKState = {
  initialized: false,
  baseUrl: '',
  accessToken: '',
  launchTime: null,
  sdkVersion: '0.1.0',
};

const sdkSlice = createSlice({
  name: 'sdk',
  initialState,
  reducers: {
    initializeSDK(
      state,
      action: PayloadAction<{ baseUrl: string; accessToken: string }>
    ) {
      state.baseUrl = action.payload.baseUrl;
      state.accessToken = action.payload.accessToken;
      state.initialized = true;
    },
    launchSDK(state) {
      state.launchTime = new Date().toISOString();
    },
    destroySDK() {
      return initialState;
    },
    resetSDK() {
      return initialState;
    },
    updateAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
  },
  selectors: {
    selectSDKState: (state) => state,
    selectBaseUrl: (state) => state.baseUrl,
    selectAccessToken: (state) => state.accessToken,
    selectSDKInitialized: (state) => state.initialized,
  },
});

export const { initializeSDK, launchSDK, destroySDK, resetSDK, updateAccessToken } =
  sdkSlice.actions;

export const { selectSDKState, selectBaseUrl, selectAccessToken, selectSDKInitialized } =
  sdkSlice.selectors;

export default sdkSlice.reducer;
