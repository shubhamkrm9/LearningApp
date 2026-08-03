import CryptoJS from 'crypto-js';

export const generateSignature = (canonicalRequest: string, secret: string): string => {
  return CryptoJS.HmacSHA256(canonicalRequest, secret).toString(CryptoJS.enc.Hex);
};

export const hashBody = (body: string): string => {
  return CryptoJS.SHA256(body).toString(CryptoJS.enc.Hex);
};
