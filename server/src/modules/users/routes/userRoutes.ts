import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../../../shared/infra/passport';
import { UserService } from '../coreLogic/UserService';
import { requireAuth, optionalAuth } from '../../../shared/middleware/auth';
import { validate } from '../../../shared/middleware/validate';
import { authLimiter } from '../../../shared/middleware/rateLimiter';
import {
  RegisterSchema,
  VerifyOtpSchema,
  LoginSchema,
  UpdateProfileSchema,
} from '../DTOs/UserDTOs';

const router = Router();
const userService = new UserService();

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post('/auth/register', authLimiter, validate(RegisterSchema), async (req: Request, res: Response) => {
  const result = await userService.initiateRegister(req.body as Parameters<UserService['initiateRegister']>[0]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.post('/auth/verify-otp', authLimiter, validate(VerifyOtpSchema), async (req: Request, res: Response) => {
  const result = await userService.verifyOtp(req.body as Parameters<UserService['verifyOtp']>[0]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(201).json(result.getValue());
});

router.post('/auth/login', authLimiter, validate(LoginSchema), async (req: Request, res: Response) => {
  const result = await userService.login(req.body as Parameters<UserService['login']>[0]);
  if (result.isFailure) { res.status(401).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get('/users/me', requireAuth, async (req: Request, res: Response) => {
  const result = await userService.getMyProfile(req.user!.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.patch('/users/me', requireAuth, validate(UpdateProfileSchema), async (req: Request, res: Response) => {
  const result = await userService.updateProfile(
    req.user!.userId,
    req.body as Parameters<UserService['updateProfile']>[1]
  );
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.get('/users/:id', optionalAuth, async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  const result = await userService.getUserById(id, req.user?.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

// ─── Admin: Credit Adjustment ────────────────────────────────────────────────
// Only admin / web_admin can call this. Adjusts a user's creditScore by a delta.
// Body: { delta: number }  (positive to add, negative to subtract)

router.patch('/admin/users/:id/credit', requireAuth, async (req: Request, res: Response) => {
  const requestingUser = await import('../DBSchemas/UserSchema').then(m => m.UserModel.findById(req.user!.userId));
  if (!requestingUser || !['admin', 'web_admin'].includes(requestingUser.role ?? '')) {
    res.status(403).json({ message: 'Forbidden.' }); return;
  }
  const delta = Number((req.body as { delta: unknown }).delta);
  if (!Number.isFinite(delta)) { res.status(400).json({ message: 'delta must be a number.' }); return; }
  const updated = await import('../DBSchemas/UserSchema').then(m =>
    m.UserModel.findByIdAndUpdate(req.params['id'], { $inc: { creditScore: delta } }, { new: true })
  );
  if (!updated) { res.status(404).json({ message: 'User not found.' }); return; }
  res.status(200).json({ userId: req.params['id'], creditScore: updated.creditScore });
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Step 1 — redirect user to Google consent screen
 * GET /auth/google
 */
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'], session: false })
);

/**
 * Step 2 — Google redirects back here after consent
 * GET /auth/google/callback
 *
 * On success: redirect to <FRONTEND_URL>/auth/callback?token=<jwt>
 * On failure: redirect to <FRONTEND_URL>/login?error=oauth_failed
 */
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    // req.user is serialised by passport strategy to { userId, email }
    const { userId, email } = req.user!;
    const secret = process.env.JWT_SECRET;
    if (!secret) { res.status(500).json({ message: 'JWT not configured.' }); return; }

    const token = jwt.sign({ userId, email }, secret, { expiresIn: '7d' });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// ─── Follow ───────────────────────────────────────────────────────────────────

router.post('/users/:id/follow', requireAuth, async (req: Request, res: Response) => {
  const result = await userService.followUser(req.user!.userId, String(req.params['id']));
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Followed successfully.' });
});

router.delete('/users/:id/follow', requireAuth, async (req: Request, res: Response) => {
  const result = await userService.unfollowUser(req.user!.userId, String(req.params['id']));
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Unfollowed successfully.' });
});

export default router;
