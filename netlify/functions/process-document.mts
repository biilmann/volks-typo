import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { verifyAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { documentId } = await request.json();
  const drafts = getStore('drafts');

  try {
    const notionResponse = await fetch(
      `${new URL(request.url).origin}/api/notion/${documentId}`,
      {
        headers: { Cookie: request.headers.get('cookie') || '' },
      }
    );

    if (!notionResponse.ok) {
      return new Response('Failed to fetch document', { status: 500 });
    }

    const notionData = await notionResponse.json();

    const processResponse = await fetch(
      `${new URL(request.url).origin}/api/process-document-background`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ documentId, notionData }),
      }
    );

    if (!processResponse.ok) {
      return new Response('Failed to start processing', { status: 500 });
    }

    return Response.json({ id: documentId });
  } catch (error) {
    console.error('Processing queue error:', error);
    return new Response('Processing failed', { status: 500 });
  }
};