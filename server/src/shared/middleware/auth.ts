import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
}

// Augment Express.User so both JWT middleware and passport strategy
// produce the same shape. Passport serialises to { userId, email }
// before calling done(), so req.user always has these fields.
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      // Set by the Google OAuth strategy when it just created a brand-new
      // account (so the frontend can prompt the user to pick a nickname).
      isNewUser?: boolean;
    }
  }
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getSecret()) as unknown as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, getSecret()) as unknown as AuthPayload;
    req.user = decoded;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};
