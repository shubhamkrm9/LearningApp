/**
 * Learning Module SDK - Auth Slice
 *
 * Stores authentication info provided by host application.
 * SDK does not manage login — token comes from host.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  accessToken: string;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: '',
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearAccessToken() {
      return initialState;
    },
    logout() {
      return initialState;
    },
  },
  selectors: {
    selectToken: (state) => state.accessToken,
    selectAuthenticationStatus: (state) => state.isAuthenticated,
  },
});

export const { setAccessToken, clearAccessToken, logout } = authSlice.actions;
export const { selectToken, selectAuthenticationStatus } = authSlice.selectors;
export default authSlice.reducer;
