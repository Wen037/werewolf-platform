import { Router, Request, Response } from 'express';
import { MatchService } from '../coreLogic/MatchService';
import { requireAuth, optionalAuth } from '../../../shared/middleware/auth';
import { validate } from '../../../shared/middleware/validate';
import {
  CreateMatchSchema,
  RateMatchSchema,
  UpdateStatusSchema,
  ExternalPaxSchema,
  InviteUsersSchema,
  LogAttendanceSchema,
} from '../DTOs/MatchDTOs';
import { MatchStatus } from '../domain/Match';

const router = Router();
const matchService = new MatchService();

const id = (req: Request): string => String(req.params['sessionId']);

router.get('/games/active', optionalAuth, async (req: Request, res: Response) => {
  const matches = await matchService.getActiveMatches(req.user?.userId);
  res.status(200).json(matches);
});

router.get('/users/me/events', requireAuth, async (req: Request, res: Response) => {
  const events = await matchService.getMyEvents(req.user!.userId);
  res.status(200).json(events);
});

// Single match detail — must be registered BEFORE any /:sessionId mutation routes
router.get('/games/:sessionId', optionalAuth, async (req: Request, res: Response) => {
  const result = await matchService.getMatchById(id(req), req.user?.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.post('/games', requireAuth, validate(CreateMatchSchema), async (req: Request, res: Response) => {
  const result = await matchService.createMatch(req.user!.userId, req.body as Parameters<MatchService['createMatch']>[1]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(201).json(result.getValue());
});

router.post('/games/:sessionId/join', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.joinMatch(id(req), req.user!.userId);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.delete('/games/:sessionId/leave', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.leaveMatch(id(req), req.user!.userId);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Left match successfully.' });
});

router.post('/games/:sessionId/rate', requireAuth, validate(RateMatchSchema), async (req: Request, res: Response) => {
  const result = await matchService.rateMatch(id(req), req.user!.userId, req.body as Parameters<MatchService['rateMatch']>[2]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Rating saved.' });
});

router.post('/games/:sessionId/like', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.toggleLike(id(req), req.user!.userId);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.patch('/games/:sessionId/status', requireAuth, validate(UpdateStatusSchema), async (req: Request, res: Response) => {
  const result = await matchService.updateMatchStatus(
    id(req),
    req.user!.userId,
    (req.body as { status: MatchStatus }).status
  );
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Status updated.' });
});

router.patch('/games/:sessionId/external-pax', requireAuth, validate(ExternalPaxSchema), async (req: Request, res: Response) => {
  const result = await matchService.setExternalPax(id(req), req.user!.userId, (req.body as { count: number }).count);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'External attendee count updated.' });
});

router.patch('/games/:sessionId/attendance', requireAuth, validate(LogAttendanceSchema), async (req: Request, res: Response) => {
  const result = await matchService.logAttendance(id(req), req.user!.userId, req.body as Parameters<MatchService['logAttendance']>[2]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Attendance logged.' });
});

router.post('/games/:sessionId/invite', requireAuth, validate(InviteUsersSchema), async (req: Request, res: Response) => {
  const result = await matchService.inviteUsers(id(req), req.user!.userId, req.body as Parameters<MatchService['inviteUsers']>[2]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Invites sent.' });
});

export default router;
