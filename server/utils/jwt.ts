import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kisaniq-super-secret-production-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  farmerId?: string;
  phone: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
