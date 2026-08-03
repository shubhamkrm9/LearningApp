/**
 * Learning Module SDK - Certificate Slice
 *
 * Manages certificate availability and URL.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CertificateState {
  available: boolean;
  certificateUrl: string | null;
  certificateId: string | null;
  issuedAt: string | null;
  loading: boolean;
}

const initialState: CertificateState = {
  available: false,
  certificateUrl: null,
  certificateId: null,
  issuedAt: null,
  loading: false,
};

const certificateSlice = createSlice({
  name: 'certificate',
  initialState,
  reducers: {
    setCertificate(
      state,
      action: PayloadAction<{
        certificateId: string;
        certificateUrl: string;
        issuedAt: string;
      }>
    ) {
      state.available = true;
      state.certificateId = action.payload.certificateId;
      state.certificateUrl = action.payload.certificateUrl;
      state.issuedAt = action.payload.issuedAt;
      state.loading = false;
    },
    setCertificateLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearCertificate() {
      return initialState;
    },
    resetCertificate() {
      return initialState;
    },
  },
  selectors: {
    selectCertificate: (state) => state,
    selectCertificateUrl: (state) => state.certificateUrl,
    selectCertificateAvailability: (state) => state.available,
    selectCertificateLoading: (state) => state.loading,
  },
});

export const {
  setCertificate,
  setCertificateLoading,
  clearCertificate,
  resetCertificate,
} = certificateSlice.actions;

export const {
  selectCertificate,
  selectCertificateUrl,
  selectCertificateAvailability,
  selectCertificateLoading,
} = certificateSlice.selectors;

export default certificateSlice.reducer;
