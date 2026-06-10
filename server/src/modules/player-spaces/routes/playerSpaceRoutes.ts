import { Router, Request, Response } from 'express';
import { PlayerSpaceService } from '../coreLogic/PlayerSpaceService';
import { MatchService } from '../../matches/coreLogic/MatchService';
import { requireAuth, optionalAuth } from '../../../shared/middleware/auth';
import { validate } from '../../../shared/middleware/validate';
import { CreatePlayerSpaceSchema, UpdatePlayerSpaceSchema, RateVenueSchema, LeaveOwnerMessageSchema } from '../DTOs/PlayerSpaceDTOs';
import { PlayerSpaceModel } from '../DBSchemas/PlayerSpaceSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { sendBookingInquiryEmail } from '../../../shared/infra/email';

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

// ─── Booking inquiry — guest sends a booking request to the space owner ──────
// Body: { date, time, duration, pax, name, contact, notes? }
// Returns: { autoConfirmed: boolean }
router.post('/venues/:id/booking-inquiry', async (req: Request, res: Response) => {
  const venueId = String(req.params['id']);

  const venue = await PlayerSpaceModel.findById(venueId).lean();
  if (!venue) {
    res.status(404).json({ message: 'Venue not found.' });
    return;
  }

  const { date, time, duration, pax, name, contact, notes } = req.body as {
    date: string; time: string; duration: string; pax: number;
    name: string; contact: string; notes?: string;
  };

  if (!date || !time || !duration || !pax || !name || !contact) {
    res.status(400).json({ message: 'Missing required booking fields.' });
    return;
  }

  // School / public spaces → auto-confirm; private venues → inquiry
  const isAutoConfirmed = venue.type === 'school';

  // Fetch owner email so we can notify them
  const owner = await UserModel.findById(venue.owner_id).select('email').lean();
  if (owner?.email) {
    const emailPayload = {
      venueName: venue.name,
      date, time, duration, pax: Number(pax),
      name, contact,
      isAutoConfirmed,
      ...(notes ? { notes } : {}),
    };
    await sendBookingInquiryEmail(owner.email, emailPayload);
  }

  res.status(200).json({ autoConfirmed: isAutoConfirmed });
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

// ─── Leave a message for the space owner (1 per user per venue) ──────────────
router.post('/venues/:id/owner-message', requireAuth, validate(LeaveOwnerMessageSchema), async (req: Request, res: Response) => {
  const result = await playerSpaceService.leaveOwnerMessage(
    String(req.params['id']),
    req.user!.userId,
    (req.body as { message: string }).message
  );
  if (result.isFailure) {
    const err = result.getError() ?? '';
    if (err === 'ALREADY_SENT') { res.status(409).json({ message: 'You have already sent a message to this space owner.' }); return; }
    if (err.includes('not found')) { res.status(404).json({ message: err }); return; }
    res.status(400).json({ message: err });
    return;
  }
  res.status(201).json({ message: 'Message sent.' });
});

// ─── Admin: toggle pin status of a venue ─────────────────────────────────────
router.patch('/admin/venues/:id/pin', requireAuth, async (req: Request, res: Response) => {
  const result = await playerSpaceService.pinVenue(String(req.params['id']), req.user!.userId);
  if (result.isFailure) {
    const status = result.getError()?.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ message: result.getError() });
    return;
  }
  res.status(200).json(result.getValue());
});

// ─── Admin: transfer venue ownership to another registered user ─────────────
// Body: { newOwnerEmail: string }
router.patch('/admin/venues/:id/transfer-owner', requireAuth, async (req: Request, res: Response) => {
  const { newOwnerEmail } = req.body as { newOwnerEmail?: string };
  if (typeof newOwnerEmail !== 'string' || !newOwnerEmail.trim()) {
    res.status(400).json({ message: 'newOwnerEmail (string) is required.' });
    return;
  }
  const result = await playerSpaceService.transferOwnership(
    String(req.params['id']),
    req.user!.userId,
    newOwnerEmail
  );
  if (result.isFailure) {
    const err = result.getError() ?? '';
    const status = err.includes('Forbidden') ? 403 : err.includes('not found') ? 404 : 400;
    res.status(status).json({ message: err });
    return;
  }
  res.status(200).json(result.getValue());
});

export default router;
