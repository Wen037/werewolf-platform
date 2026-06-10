import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  role?: string;
}

// Roles that have admin access. Single source of truth — import wherever needed.
export const ADMIN_ROLES = ['admin', 'web_admin'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export function isAdminRole(role?: string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

// Augment Express.User so both JWT middleware and passport strategy
// produce the same shape.
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role?: string;
      // Set by the Google OAuth strategy when it just created a brand-new account.
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

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!isAdminRole(req.user?.role)) {
    res.status(403).json({ message: 'Forbidden: admin access required.' });
    return;
  }
  next();
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
