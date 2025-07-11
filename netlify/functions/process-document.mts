import type { Context } from '@netlify/functions';
import { Client } from '@notionhq/client';
import { verifyAuth } from '../lib/auth.mts';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { documentId } = await request.json();
  try {
    const page = await notion.pages.retrieve({ page_id: documentId });
    const blocks: any[] = [];
    let cursor: string | undefined = undefined;
    do {
      const list = await notion.blocks.children.list({
        block_id: documentId,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(...(list.results as any[]));
      cursor = list.next_cursor as string | undefined;
    } while (cursor);

    const notionData = { page, blocks };
    context.waitUntil(
      context.functions.invoke('process-document-background', {
        documentId,
        notionData,
      })
    );
    return new Response(JSON.stringify({ id: documentId }), { status: 200 });
  } catch (error) {
    console.error('Process init error:', error);
    return new Response('Failed to initiate processing', { status: 500 });
  }
};