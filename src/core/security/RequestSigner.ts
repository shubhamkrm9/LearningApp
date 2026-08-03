import CryptoJS from 'crypto-js';

const APP_SECRET_KEY = 'ENTERPRISE_HMAC_SECRET_123'; // Matches mock-security-server

export const signRequest = (
  method: string,
  url: string,
  body: any,
  headers: Record<string, string>
) => {
  const timestamp = new Date().getTime().toString();
  const nonce = CryptoJS.lib.WordArray.random(16).toString();
  
  // Canonical URI (stripping host)
  const canonicalUri = new URL(url, 'http://10.243.14.222:3000').pathname;
  
  // Sorted Query Params (mock implementation for simplicity)
  const queryParams = url.split('?')[1] || '';
  const sortedQueryParams = queryParams.split('&').sort().join('&');
  
  // Canonical Headers (Must match backend: host, x-amz-date, x-amz-nonce)
  const canonicalHeaders = `host:10.243.14.222:3000\nx-amz-date:${timestamp}\nx-amz-nonce:${nonce}\n`;
  const signedHeaders = 'host;x-amz-date;x-amz-nonce';
    
  // Body Hash
  let bodyString = '';
  if (body) {
    if (typeof body === 'string') {
      bodyString = body;
    } else if (Object.keys(body).length > 0) {
      bodyString = JSON.stringify(body);
    }
  }
  const bodyHash = CryptoJS.SHA256(bodyString).toString(CryptoJS.enc.Hex);

  // Construct Canonical Request
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    '', // Empty query string for now to match backend simple URI extraction
    canonicalHeaders,
    signedHeaders,
    bodyHash
  ].join('\n');

  // Sign
  const signature = CryptoJS.HmacSHA256(canonicalRequest, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

  return {
    'x-amz-date': timestamp,
    'x-amz-nonce': nonce,
    'Authorization': signature, // Backend expects signature directly in header for this mock, wait no...
  };
};
