import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { verifyAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const draftId = request.url.split('/').pop();
  const drafts = getStore('drafts');

  try {
    const data = await drafts.get(draftId);
    if (!data) {
      return new Response('Draft not found', { status: 404 });
    }

    return Response.json(JSON.parse(data));
  } catch (error) {
    console.error('Get draft error:', error);
    return new Response('Error fetching draft', { status: 500 });
  }
};