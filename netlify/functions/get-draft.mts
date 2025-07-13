import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { requireAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  try {
    requireAuth(request);
  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documentId = request.url.split('/').pop();
  const drafts = getStore('drafts');

  try {
    const documentData = await drafts.get(documentId);
    if (!documentData) {
      return new Response('Document not found', { status: 404 });
    }
    return new Response(documentData, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get draft error:', error);
    return new Response('Failed to get document', { status: 500 });
  }
};