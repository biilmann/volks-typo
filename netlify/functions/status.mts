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
    const statusData = await drafts.get(`${documentId}-status`);
    if (statusData) {
      return new Response(statusData, { status: 200 });
    }
    const document = await drafts.get(documentId!);
    if (document) {
      return new Response(
        JSON.stringify({
          status: 'done',
          step: 'complete',
          progress: 100,
          message: 'Processing complete!',
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        status: 'not_found',
        step: 'error',
        progress: 0,
        message: 'Document not found',
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response('Status check failed', { status: 500 });
  }
};