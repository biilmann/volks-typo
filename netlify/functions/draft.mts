import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(_req: Request, context: Context) {
  const drafts = getStore("drafts");
  const id = context.params.id;
  try {
    const draftData = await drafts.get(id, { type: 'json' });
    if (!draftData) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(draftData), { headers: { 'content-type': 'application/json' } });
  } catch (error: any) {
    console.error('Error fetching draft:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch draft' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export const config: Config = {
  path: "/api/draft/:id"
};