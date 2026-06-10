import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// max() is a function so it's evaluated per-request (after dotenv has loaded),
// preventing the module-load timing issue where process.env.NODE_ENV is still undefined.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (_req: Request, _res: Response) => (process.env.NODE_ENV === 'test' ? 1000 : 10),
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const contactLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: (_req: Request, _res: Response) => (process.env.NODE_ENV === 'test' ? 1000 : 1),
  message: { message: 'You can only send one message every 2 hours. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (_req: Request, _res: Response) => (process.env.NODE_ENV === 'test' ? 10000 : 60),
  message: { message: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
