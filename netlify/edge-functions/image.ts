import { Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  if (!filename || !pathParts.includes('article-images')) {
    return new Response('Media filename required', { status: 400 });
  }
  try {
    const images = getStore("images");
    const [mediaData, metadata] = await Promise.all([
      images.get(filename, { type: 'arrayBuffer' }),
      images.getMetadata(filename)
    ]);
    if (!mediaData) {
      return new Response('Media not found', { status: 404 });
    }
    const contentType = metadata?.contentType || getContentTypeFromFilename(filename);
    const response = new Response(mediaData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': `"${filename}"`,
      }
    });
    return response;
  } catch (error) {
    console.error('Error serving media:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

function getContentTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const contentTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    ogv: 'video/ogg'
  };
  return contentTypes[extension || ''] || 'image/png';
}

export const config = {
  path: "/article-images/*",
};