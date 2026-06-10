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
  AddGuestSchema,
  MessagePlayerSchema,
  NotifyAllSchema,
  UpdateSessionSchema,
  AddCommentSchema,
  UpdateRecapSchema,
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

// ── Host Control Panel routes ─────────────────────────────────────────────────

router.get('/games/:sessionId/roster', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.getRoster(id(req), req.user!.userId);
  if (result.isFailure) { res.status(403).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.delete('/games/:sessionId/players/:userId', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.kickPlayer(id(req), req.user!.userId, String(req.params['userId']));
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Player removed.' });
});

router.post('/games/:sessionId/guests', requireAuth, validate(AddGuestSchema), async (req: Request, res: Response) => {
  const result = await matchService.addGuest(id(req), req.user!.userId, (req.body as { name: string }).name);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Guest added.' });
});

router.delete('/games/:sessionId/guests/:index', requireAuth, async (req: Request, res: Response) => {
  const index = parseInt(String(req.params['index']), 10);
  if (isNaN(index)) { res.status(400).json({ message: 'Invalid guest index.' }); return; }
  const result = await matchService.removeGuest(id(req), req.user!.userId, index);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Guest removed.' });
});

router.post('/games/:sessionId/message', requireAuth, validate(MessagePlayerSchema), async (req: Request, res: Response) => {
  const { userId, message } = req.body as { userId: string; message: string };
  const result = await matchService.messagePlayer(id(req), req.user!.userId, userId, message);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Message sent.' });
});

router.post('/games/:sessionId/notify', requireAuth, validate(NotifyAllSchema), async (req: Request, res: Response) => {
  const result = await matchService.notifyAll(id(req), req.user!.userId, (req.body as { message: string }).message);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'All players notified.' });
});

router.patch('/games/:sessionId', requireAuth, validate(UpdateSessionSchema), async (req: Request, res: Response) => {
  const result = await matchService.updateSession(id(req), req.user!.userId, req.body as Parameters<MatchService['updateSession']>[2]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.patch('/games/:sessionId/applicants/:userId/approve', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.approveApplicant(id(req), req.user!.userId, String(req.params['userId']));
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Applicant approved.' });
});

router.patch('/games/:sessionId/applicants/:userId/reject', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.rejectApplicant(id(req), req.user!.userId, String(req.params['userId']));
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Applicant rejected.' });
});

router.patch('/games/:sessionId/cancel', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.cancelWithPenalty(id(req), req.user!.userId);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Session cancelled.' });
});

// ── Comments ──────────────────────────────────────────────────────────────────

router.get('/games/:sessionId/comments', optionalAuth, async (req: Request, res: Response) => {
  const comments = await matchService.getComments(id(req));
  res.status(200).json(comments);
});

router.post('/games/:sessionId/comments', requireAuth, validate(AddCommentSchema), async (req: Request, res: Response) => {
  const result = await matchService.addComment(id(req), req.user!.userId, (req.body as { text: string }).text);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(201).json(result.getValue());
});

router.delete('/games/:sessionId/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.deleteComment(id(req), String(req.params['commentId']), req.user!.userId);
  if (result.isFailure) { res.status(403).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Comment deleted.' });
});

router.patch('/games/:sessionId/comments/lock', requireAuth, async (req: Request, res: Response) => {
  const locked = Boolean((req.body as { locked?: boolean }).locked);
  const result = await matchService.lockComments(id(req), req.user!.userId, locked);
  if (result.isFailure) { res.status(403).json({ message: result.getError() }); return; }
  res.status(200).json({ message: locked ? 'Comments locked.' : 'Comments unlocked.' });
});

// ── Post-event recap ──────────────────────────────────────────────────────────

router.patch('/games/:sessionId/recap', requireAuth, validate(UpdateRecapSchema), async (req: Request, res: Response) => {
  const result = await matchService.updateRecap(id(req), req.user!.userId, (req.body as { text?: string }).text ?? '');
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Recap updated.' });
});

// ── Admin: toggle pin status of a match ──────────────────────────────────────
router.patch('/admin/games/:sessionId/pin', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.pinMatch(id(req), req.user!.userId);
  if (result.isFailure) {
    const status = result.getError()?.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ message: result.getError() });
    return;
  }
  res.status(200).json(result.getValue());
});

// ── Venue approval routes ─────────────────────────────────────────────────────

router.patch('/games/:sessionId/venue-approve', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.approveVenueSession(id(req), req.user!.userId);
  if (result.isFailure) { res.status(403).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Session approved by venue.' });
});

router.patch('/games/:sessionId/venue-reject', requireAuth, async (req: Request, res: Response) => {
  const result = await matchService.rejectVenueSession(id(req), req.user!.userId);
  if (result.isFailure) { res.status(403).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Session rejected by venue.' });
});

export default router;
