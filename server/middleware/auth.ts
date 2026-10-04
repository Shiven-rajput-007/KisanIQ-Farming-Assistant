import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  userId?: string;
  farmerId?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  req.user = payload;
  req.userId = payload.userId;
  req.farmerId = payload.farmerId;
  next();
}

/**
 * Optional authentication middleware: if token present, sets user and farmerId;
 * if not present, leaves req.user and req.farmerId undefined (guest access).
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
      req.userId = payload.userId;
      req.farmerId = payload.farmerId;
      return next();
    }
  }

  // Unauthenticated guest: leave req.user, req.userId, req.farmerId undefined
  req.user = undefined;
  req.userId = undefined;
  req.farmerId = undefined;
  next();
}
