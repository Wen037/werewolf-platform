import crypto from 'crypto';

/**
 * Cloudinary signed upload helper (Plan B — backend-signed uploads).
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME — your Cloudinary cloud name (e.g. "werewolfsg")
 *   CLOUDINARY_API_KEY    — 15-digit number from Cloudinary dashboard
 *   CLOUDINARY_API_SECRET — 27-char secret from Cloudinary dashboard
 *
 * Flow:
 *   1. Frontend calls POST /api/upload/sign with { folder, publicId? }
 *   2. Backend generates a signature and returns { signature, timestamp, apiKey, cloudName, folder }
 *   3. Frontend uploads directly to https://api.cloudinary.com/v1_1/<cloudName>/image/upload
 *      using the signature + apiKey (secret never leaves the backend)
 *   4. Cloudinary returns the secure_url
 *   5. Frontend sends the URL to the relevant backend endpoint (PATCH /users/me, PATCH /venues/:id, etc.)
 */

export interface CloudinarySignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function generateUploadSignature(
  folder: string,
  publicId?: string
): CloudinarySignatureResult {
  const secret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!secret || !apiKey || !cloudName) {
    throw new Error('Cloudinary env vars not configured.');
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Build the string-to-sign: sorted key=value pairs + secret
  const params: Record<string, string | number> = { folder, timestamp };
  if (publicId) params['public_id'] = publicId;

  const sortedStr = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  const signature = crypto
    .createHash('sha256')
    .update(sortedStr + secret)
    .digest('hex');

  return { signature, timestamp, apiKey, cloudName, folder };
}
