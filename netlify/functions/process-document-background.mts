import type { Context } from '@netlify/functions';
import { OpenAI } from 'openai';
import { getStore } from '@netlify/blobs';
import { verifyAuth } from '../lib/auth.mts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (request: Request, context: Context) => {
  const auth = verifyAuth(request);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { documentId, notionData } = await request.json();
  const drafts = getStore('drafts');
  const images = getStore('images');

  try {
    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'processing',
        step: 'initializing',
        progress: 10,
        message: 'Starting document processing...',
        timestamp: new Date().toISOString(),
      })
    );

    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'processing',
        step: 'processing_images',
        progress: 30,
        message: 'Processing images...',
        timestamp: new Date().toISOString(),
      })
    );

    const imageMapping = await processNotionImages(notionData.blocks, images);

    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'processing',
        step: 'ai_conversion',
        progress: 60,
        message: 'Converting content with AI...',
        timestamp: new Date().toISOString(),
      })
    );

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Convert this Notion document to a blog post in markdown format.

COPY EDITOR GUIDELINES:
- Extract metadata (title, description, author, publishDate)
- Convert to clean markdown with proper heading structure
- Preserve the author's voice and technical accuracy
- Use ## for main headings (no # level 1 headings)
- Handle images and videos appropriately
- Keep descriptions between 150-160 characters for SEO
- Set publishDate to today's date: ${new Date().toISOString().split('T')[0]}

Return a JSON object with:
{
  "meta": {
    "title": "Article Title",
    "description": "SEO-friendly description (150-160 chars)",
    "author": "Author Name",
    "publishDate": "YYYY-MM-DD"
  },
  "markdown": "# Article content in markdown format"
}

CRITICAL: Only convert actual headings to markdown headings. Don't add heading markup to regular text.`,
        },
        {
          role: 'user',
          content: `Convert this Notion document:\n\n${JSON.stringify(
            notionData,
            null,
            2
          )}`,
        },
      ],
      temperature: 0.3,
    });

    const result = JSON.parse(aiResponse.choices[0].message.content!);
    result.markdown = processMarkdownImages(result.markdown, imageMapping);

    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'processing',
        step: 'finalizing',
        progress: 90,
        message: 'Finalizing...',
        timestamp: new Date().toISOString(),
      })
    );

    await drafts.set(documentId, JSON.stringify(result));

    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'done',
        step: 'complete',
        progress: 100,
        message: 'Processing complete!',
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('Processing error:', error);
    await drafts.set(
      `${documentId}-status`,
      JSON.stringify({
        status: 'error',
        step: 'error',
        progress: 0,
        message: 'Processing failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    );
    return new Response('Processing failed', { status: 500 });
  }
};

async function processNotionImages(blocks: any[], images: any) {
  const imageMapping: Record<string, string> = {};
  for (const block of blocks) {
    if (block.type === 'image' && block.image?.file?.url) {
      try {
        const url = block.image.file.url;
        const filename = await downloadAndSaveImage(url, images);
        imageMapping[url] = `/article-images/${filename}`;
      } catch (error) {
        console.error('Image download failed:', error);
      }
    }
  }
  return imageMapping;
}

async function downloadAndSaveImage(url: string, images: any) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const hash = btoa(url).substring(0, 8);
  const extension = contentType.split('/')[1] || 'jpg';
  const filename = `image_${hash}.${extension}`;
  await images.set(filename, buffer, {
    metadata: {
      contentType,
      uploadedAt: new Date().toISOString(),
    },
  });
  return filename;
}

function processMarkdownImages(
  markdown: string,
  imageMapping: Record<string, string>
) {
  for (const [originalUrl, localPath] of Object.entries(imageMapping)) {
    markdown = markdown.replace(
      new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      localPath
    );
  }
  return markdown;
}