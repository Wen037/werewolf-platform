import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middleware/auth';
import { NotificationModel } from '../DBSchemas/NotificationSchema';

const router = Router();

router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  const notifications = await NotificationModel.find({
    recipientId: req.user!.userId,
    channel: 'in-app',
  })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(notifications);
});

router.get('/notifications/unread-count', requireAuth, async (req: Request, res: Response) => {
  const count = await NotificationModel.countDocuments({
    recipientId: req.user!.userId,
    channel: 'in-app',
    isRead: false,
  });
  res.status(200).json({ count });
});

router.patch('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  await NotificationModel.findOneAndUpdate(
    { _id: String(req.params['id']), recipientId: req.user!.userId },
    { $set: { isRead: true } }
  );
  res.status(200).json({ message: 'Marked as read.' });
});

router.patch('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  await NotificationModel.updateMany(
    { recipientId: req.user!.userId, isRead: false },
    { $set: { isRead: true } }
  );
  res.status(200).json({ message: 'All notifications marked as read.' });
});

export default router;
