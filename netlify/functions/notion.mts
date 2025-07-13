import type { Context } from '@netlify/functions';
import { Client } from '@notionhq/client';
import { requireAuth } from '../lib/auth.mts';

export default async (request: Request, context: Context) => {
  try {
    requireAuth(request);
  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }

  const notion = new Client({ auth: Netlify.env.get('NOTION_API_KEY') });
  const url = new URL(request.url);
  const path = url.pathname.split('/').pop();

  if (request.method === 'GET') {
    const searchTerm = url.searchParams.get('s');
    if (searchTerm) {
      try {
        const response = await notion.search({
          query: searchTerm,
          filter: { property: 'object', value: 'page' },
        });
        const results = response.results.map((page: any) => {
          let title = 'Untitled';
          const properties = page.properties || {};
          for (const [key, value] of Object.entries(properties)) {
            if (key.toLowerCase().includes('title') || key === 'Name') {
              const prop = value as any;
              if (prop.title?.[0]?.plain_text) {
                title = prop.title[0].plain_text;
                break;
              }
            }
          }
          return {
            id: page.id,
            title,
            url: page.url,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
          };
        });
        return Response.json(results);
      } catch (error) {
        console.error('Notion search error:', error);
        return new Response('Search failed', { status: 500 });
      }
    }
    if (path && path !== 'notion') {
      try {
        const pageId = path;
        const page = await notion.pages.retrieve({ page_id: pageId });
        const blocks = await notion.blocks.children.list({
          block_id: pageId,
          page_size: 100,
        });
        return Response.json({ page, blocks: blocks.results });
      } catch (error) {
        console.error('Notion fetch error:', error);
        return new Response('Document not found', { status: 404 });
      }
    }
  }
  return new Response('Not found', { status: 404 });
};