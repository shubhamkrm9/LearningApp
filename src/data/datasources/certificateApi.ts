/**
 * Learning Module SDK - Certificate API
 *
 * GET /certificate — Fetch certificate URL (only available if all modules completed)
 */

import { baseApi } from './baseApi';
import type { CertificateResponse } from '@shared/types/certificate';

import certificateMock from '@data/mocks/certificate.json';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export const certificateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCertificate: builder.query<CertificateResponse, void>({
      queryFn: async () => {
        await delay(500);
        return { data: certificateMock.data as CertificateResponse };
      },
      providesTags: ['Certificate'],
    }),
  }),
});

export const { useGetCertificateQuery, useLazyGetCertificateQuery } = certificateApi;
