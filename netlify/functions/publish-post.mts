import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { requireAuth } from '../lib/auth.mts';
import { promises as fs } from 'fs';
import { join } from 'path';

export default async (request: Request, context: Context) => {
  try {
    requireAuth(request);
  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { documentId } = await request.json();
  const drafts = getStore('drafts');
  
  try {
    const documentData = await drafts.get(documentId);
    if (!documentData) {
      return new Response('Document not found', { status: 404 });
    }

    const document = JSON.parse(documentData);
    
    const slug = document.meta.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const frontmatter = `---
title: "${document.meta.title}"
author: "${document.meta.author}"
publishDate: "${document.meta.publishDate}"
description: "${document.meta.description}"
---

`;

    const fileContent = frontmatter + document.markdown;
    const fileName = `${slug}.md`;
    const contentDir = 'src/content/articles';
    const filePath = join(process.cwd(), contentDir, fileName);

    await fs.writeFile(filePath, fileContent, 'utf8');

    await drafts.delete(documentId);
    await drafts.delete(`${documentId}-status`);

    return new Response(JSON.stringify({ 
      success: true, 
      fileName,
      filePath: `${contentDir}/${fileName}` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Publishing error:', error);
    return new Response('Publishing failed', { status: 500 });
  }
};