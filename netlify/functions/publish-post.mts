import { getStore } from "@netlify/blobs";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Config } from "@netlify/functions";

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createMarkdownFile(meta: any, markdown: string): string {
  const frontmatterLines = [
    '---',
    `title: "${meta.title}"`,
    `date: "${meta.publishDate}"`,
    `author: "${meta.author || ''}"`,
    `excerpt: "${meta.description}"`,
    ...(meta.heroImage ? [`image: "${meta.heroImage}"`] : []),
    'draft: false',
    '---',
    '',
  ];
  return frontmatterLines.join('\n') + markdown;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  try {
    const { id, meta, markdown } = await req.json();
    const drafts = getStore("drafts");
    const draftExists = await drafts.get(id);
    if (!draftExists) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }
    const slug = createSlug(meta.title);
    const fileContent = createMarkdownFile(meta, markdown);
    const articlesDir = join(process.cwd(), 'src/pages/blog');
    await mkdir(articlesDir, { recursive: true });
    const filePath = join(articlesDir, `${slug}.md`);
    await writeFile(filePath, fileContent, 'utf-8');
    await drafts.delete(id);
    return new Response(JSON.stringify({ 
      success: true, 
      slug: slug,
      filePath: `src/pages/blog/${slug}.md`
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Publishing error:', error);
    return new Response(JSON.stringify({ error: 'Failed to publish post' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export const config: Config = {
  path: '/api/publish-post'
};