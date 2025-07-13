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
    const statusData = await drafts.get(`${documentId}-status`);
    
    if (statusData) {
      return Response.json(JSON.parse(statusData));
    }

    const document = await drafts.get(documentId);
    if (document) {
      return Response.json({
        status: 'done',
        step: 'complete',
        progress: 100,
        message: 'Processing complete!',
      });
    }

    return Response.json({
      status: 'not_found',
      step: 'error',
      progress: 0,
      message: 'Document not found',
    });

  } catch (error) {
    return new Response('Status check failed', { status: 500 });
  }
};