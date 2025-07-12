import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { verifyAuth } from '../lib/auth.mts';
import { SITE_CONFIG } from '../lib/config.mts';
import { promises as fs } from 'fs';
import { join } from 'path';

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
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
    const filePath = join(process.cwd(), SITE_CONFIG.contentDir, fileName);

    await fs.writeFile(filePath, fileContent, 'utf8');

    await drafts.delete(documentId);
    await drafts.delete(`${documentId}-status`);

    return Response.json({
      success: true,
      fileName,
      filePath: `${SITE_CONFIG.contentDir}/${fileName}`,
    });
  } catch (error) {
    console.error('Publishing error:', error);
    return new Response('Publishing failed', { status: 500 });
  }
};