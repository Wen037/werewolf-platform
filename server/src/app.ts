import dotenv from 'dotenv';
dotenv.config(); // must run before any import that reads process.env (e.g. passport strategy)

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';

import { apiLimiter } from './shared/middleware/rateLimiter';

// Passport strategy registration (side-effect: registers Google OAuth strategy)
import './shared/infra/passport';

import { sendContactEmail } from './shared/infra/email';
import userRoutes from './modules/users/routes/userRoutes';
import playerSpaceRoutes from './modules/player-spaces/routes/playerSpaceRoutes';
import matchRoutes from './modules/matches/routes/matchRoutes';
import notificationRoutes from './modules/notifications/routes/notificationRoutes';
import mapRoutes from './modules/map/routes/mapRoutes';
import uploadRoutes from './modules/upload/uploadRoutes';

// Side-effect import: registers all EventBus handlers on startup
import './modules/notifications/coreLogic/NotificationService';

const app = express();

// Trust Fly.io / any reverse-proxy's X-Forwarded-* headers so that
// req.protocol resolves to 'https' (not the internal 'http').
// This is required for passport's relative callbackURL to build the
// correct https:// redirect URI for Google OAuth.
app.set('trust proxy', 1);

// ─── Security middleware (order matters) ─────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Passport (stateless — session: false used in all strategies)
app.use(passport.initialize());

// Global API rate limit — auth routes apply stricter limit via authLimiter inside their router
app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// ─── Module routers ───────────────────────────────────────────────────────────
app.use('/api', userRoutes);
app.use('/api', playerSpaceRoutes);
app.use('/api', matchRoutes);
app.use('/api', notificationRoutes);
app.use('/api', mapRoutes);
app.use('/api', uploadRoutes);

// ─── Contact form (public, no auth) ──────────────────────────────────────────
app.post('/api/contact', async (req: Request, res: Response, next: NextFunction) => {
  const { email, message } = req.body as { email?: unknown; message?: unknown };
  if (typeof email !== 'string' || !email.trim() ||
      typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ message: 'email and message are required.' });
    return;
  }
  if (email.length > 254 || message.length > 2000) {
    res.status(400).json({ message: 'Input too long.' });
    return;
  }
  try {
    await sendContactEmail(email.trim(), message.trim());
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ─── Global error handler — must be last ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);

  if (err.name === 'CastError') {
    res.status(400).json({ message: 'Invalid ID format.' });
    return;
  }
  if (err.name === 'ValidationError') {
    res.status(400).json({ message: err.message });
    return;
  }
  // Body-parser: malformed JSON body (SyntaxError with .status = 400)
  if (err.name === 'SyntaxError' && (err as NodeJS.ErrnoException).status === 400) {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }
  // Body-parser: request entity too large (PayloadTooLargeError, status 413)
  if (
    err.name === 'PayloadTooLargeError' ||
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({ message: 'Request body too large. Maximum allowed: 10kb.' });
    return;
  }

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export { app };
