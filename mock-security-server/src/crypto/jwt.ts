import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SecurityConfig } from '../config/security.config';

const KEYS_DIR = path.join(__dirname, '../../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'mock-private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'mock-public.pem');

// Auto-generate keys if they don't exist
if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
  if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  console.log('[CRYPTO] Generated new ES256 Keypair in /keys');
}

const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    expiresIn: SecurityConfig.jwtExpiry as any
  });
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, publicKey, { algorithms: ['ES256'] });
};
