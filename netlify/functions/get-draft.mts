import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { requireAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  try {
    requireAuth(request);
  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = request.url.split('/').pop();
  const drafts = getStore('drafts');
  
  try {
    const data = await drafts.get(id);
    if (!data) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(data, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Get draft error:', error);
    return new Response('Error fetching draft', { status: 500 });
  }
};
