import { Router, Request, Response } from 'express';
import { PlayerSpaceService } from '../coreLogic/PlayerSpaceService';
import { MatchService } from '../../matches/coreLogic/MatchService';
import { requireAuth, optionalAuth } from '../../../shared/middleware/auth';
import { validate } from '../../../shared/middleware/validate';
import { CreatePlayerSpaceSchema, UpdatePlayerSpaceSchema, RateVenueSchema } from '../DTOs/PlayerSpaceDTOs';

const router = Router();
const playerSpaceService = new PlayerSpaceService();
const matchService = new MatchService();

router.get('/venues', optionalAuth, async (req: Request, res: Response) => {
  const venues = await playerSpaceService.getAllVenues(req.user?.userId);
  res.status(200).json(venues);
});

router.get('/venues/:id', optionalAuth, async (req: Request, res: Response) => {
  const result = await playerSpaceService.getVenueById(String(req.params['id']), req.user?.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.get('/venues/:id/sessions', optionalAuth, async (req: Request, res: Response) => {
  const sessions = await matchService.getMatchesByVenue(
    String(req.params['id']),
    req.user?.userId
  );
  res.status(200).json(sessions);
});

// Owner-only: update mutable space properties
router.patch('/venues/:id', requireAuth, validate(UpdatePlayerSpaceSchema), async (req: Request, res: Response) => {
  const result = await playerSpaceService.updateVenue(
    String(req.params['id']),
    req.user!.userId,
    req.body as Parameters<PlayerSpaceService['updateVenue']>[2]
  );
  if (result.isFailure) {
    const status = result.getError()?.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ message: result.getError() });
    return;
  }
  res.status(200).json(result.getValue());
});

router.post('/venues', requireAuth, validate(CreatePlayerSpaceSchema), async (req: Request, res: Response) => {
  const result = await playerSpaceService.createVenue(req.user!.userId, req.body as Parameters<PlayerSpaceService['createVenue']>[1]);
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(201).json(result.getValue());
});

router.post('/venues/:id/like', requireAuth, async (req: Request, res: Response) => {
  const result = await playerSpaceService.toggleLike(String(req.params['id']), req.user!.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.post('/venues/:id/subscribe', requireAuth, async (req: Request, res: Response) => {
  const result = await playerSpaceService.toggleSubscribe(String(req.params['id']), req.user!.userId);
  if (result.isFailure) { res.status(404).json({ message: result.getError() }); return; }
  res.status(200).json(result.getValue());
});

router.post('/venues/:id/rate', requireAuth, validate(RateVenueSchema), async (req: Request, res: Response) => {
  const result = await playerSpaceService.rateVenue(
    String(req.params['id']),
    req.user!.userId,
    (req.body as { rating: number }).rating
  );
  if (result.isFailure) { res.status(400).json({ message: result.getError() }); return; }
  res.status(200).json({ message: 'Rating saved.' });
});

// ─── Admin: verify / reject a venue ──────────────────────────────────────────
// Body: { approved: boolean, reason?: string }
router.patch('/admin/venues/:id/verify', requireAuth, async (req: Request, res: Response) => {
  const { approved, reason } = req.body as { approved: boolean; reason?: string };
  if (typeof approved !== 'boolean') {
    res.status(400).json({ message: 'approved (boolean) is required.' });
    return;
  }
  const result = await playerSpaceService.verifyVenue(
    String(req.params['id']),
    req.user!.userId,
    approved,
    reason
  );
  if (result.isFailure) {
    const status = result.getError()?.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ message: result.getError() });
    return;
  }
  res.status(200).json({ message: approved ? 'Venue verified.' : 'Venue verification removed.' });
});

export default router;
