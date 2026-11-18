import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

/**
 * Uploads an image buffer to ImgBB. The API key stays on the server.
 * @param {{ buffer: Buffer, originalname?: string }} file
 */
export async function uploadToImgBB(file) {
  if (!env.imgbbKey) {
    throw new HttpError(503, 'Image upload is not configured on this server yet', 'NOT_CONFIGURED');
  }
  const form = new FormData();
  form.append('image', file.buffer.toString('base64'));
  if (file.originalname) form.append('name', file.originalname.replace(/\.[^.]+$/, '').slice(0, 60));

  const response = await fetch(`${env.imgbbUrl}?key=${encodeURIComponent(env.imgbbKey)}`, {
    method: 'POST',
    body: form,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new HttpError(502, json?.error?.message || 'The image host rejected the upload', 'UPLOAD_FAILED');
  }
  const data = json.data;
  return {
    url: data.display_url || data.url,
    thumbUrl: data.thumb?.url || data.url,
    deleteUrl: data.delete_url || null,
  };
}
