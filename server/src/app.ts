import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { apiLimiter } from './shared/middleware/rateLimiter';

import userRoutes from './modules/users/routes/userRoutes';
import playerSpaceRoutes from './modules/player-spaces/routes/playerSpaceRoutes';
import matchRoutes from './modules/matches/routes/matchRoutes';
import notificationRoutes from './modules/notifications/routes/notificationRoutes';

// Side-effect import: registers all EventBus handlers on startup
import './modules/notifications/coreLogic/NotificationService';

const app = express();

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

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export { app };
