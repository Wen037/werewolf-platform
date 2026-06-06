import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';
import { generateUploadSignature } from '../../shared/infra/cloudinary';

const router = Router();

const SignRequestSchema = z.object({
  folder: z.enum(['avatars', 'venues', 'events']),
  publicId: z.string().max(100).optional(),
});

/**
 * POST /api/upload/sign
 *
 * Generates a Cloudinary signed upload signature.
 * The client uses this to upload directly to Cloudinary — the API secret never
 * leaves the server.
 *
 * Body  : { folder: 'avatars' | 'venues' | 'events', publicId?: string }
 * Returns: { signature, timestamp, apiKey, cloudName, folder }
 */
router.post(
  '/upload/sign',
  requireAuth,
  validate(SignRequestSchema),
  (req: Request, res: Response) => {
    try {
      const { folder, publicId } = req.body as z.infer<typeof SignRequestSchema>;
      const result = generateUploadSignature(folder, publicId);
      res.status(200).json(result);
    } catch (err) {
      console.error('[Upload] Failed to generate signature:', err);
      res.status(500).json({ message: 'Image upload service is not configured.' });
    }
  }
);

export default router;
