import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { verifyAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documentId = request.url.split('/').pop();
  const drafts = getStore('drafts');

  try {
    const documentData = await drafts.get(documentId);
    
    if (!documentData) {
      return new Response('Document not found', { status: 404 });
    }

    const document = JSON.parse(documentData);
    return Response.json(document);

  } catch (error) {
    console.error('Get draft error:', error);
    return new Response('Failed to get draft', { status: 500 });
  }
};