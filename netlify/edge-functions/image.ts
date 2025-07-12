import type { Context } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const filename = url.pathname.split('/').pop();
  if (!filename) {
    return new Response('Filename required', { status: 400 });
  }

  const images = getStore('images');
  try {
    const imageData = await images.get(filename, { type: 'arrayBuffer' });
    if (!imageData) {
      return new Response('Image not found', { status: 404 });
    }

    const metadata = await images.getMetadata(filename);
    const contentType = metadata?.contentType || 'image/jpeg';

    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: filename,
      },
    });
  } catch (error) {
    console.error('Image serving error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

export const config = {
  path: '/article-images/*',
};