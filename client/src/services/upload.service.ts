import { api } from './api';

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Uploads an image file directly to Cloudinary using a backend-generated
 * signature (the API secret never leaves the server). Returns the
 * Cloudinary `secure_url` to store on the venue/event/profile record.
 */
export async function uploadImage(file: File, folder: 'avatars' | 'venues' | 'events'): Promise<string> {
  const sign = await api.post<SignResponse>('/upload/sign', { folder });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? 'Image upload failed.');
  }
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

/** Uploads multiple images in sequence, returning their secure URLs in order. */
export async function uploadImages(files: File[], folder: 'avatars' | 'venues' | 'events'): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadImage(file, folder));
  }
  return urls;
}
