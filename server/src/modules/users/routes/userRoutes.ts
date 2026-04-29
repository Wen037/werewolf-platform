import { Router, Request, Response } from 'express';
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
