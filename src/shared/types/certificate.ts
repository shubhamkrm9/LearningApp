/**
 * Learning Module SDK - Certificate Domain Models
 */

export interface Certificate {
  id: string;
  userId: string;
  certificateUrl: string;
  issuedDate: string;
}

export interface CertificateResponse {
  certificateId: string;
  certificateUrl: string;
  issuedAt: string;
}
