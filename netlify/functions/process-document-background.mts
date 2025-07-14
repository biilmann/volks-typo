import OpenAI from "openai";
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { processNotionImages, processMarkdownImages } from '../lib/image-utils.mts';

type DocumentType = "google" | "notion";

async function convertToMetadataAndMarkdown(
  openai: any,
  type: DocumentType,
  doc: string,
  docId: string
) {
  const currentDate = new Date().toISOString().split('T')[0];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Convert this ${type === 'google' ? 'Google Doc' : 'Notion page'} JSON to a blog post with metadata and markdown content.

IMPORTANT: Today's date is ${currentDate}. ALWAYS use this as the publishDate for the blog post - do NOT use any date from the original document. The publishDate should always be today's date (${currentDate}).

Return JSON with:
{
  "meta": {
    "title": "Blog post title",
    "author": "Mathias Biilmann",
    "publishDate": "YYYY-MM-DD",
    "description": "Meta description 150-160 chars",
    "heroImage": "URL if present (optional)",
    "notionId": "${docId}"
  },
  "markdown": "Full markdown content without the main title"
}`
      },
      { role: "user", content: doc }
    ],
    response_format: { type: "json_object" }
  });
  return JSON.parse(completion.choices[0].message.content || '{}');
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const openai = new OpenAI({ apiKey: Netlify.env.get('OPENAI_API_KEY') });
  const { id, doc, type } = await req.json();
  
  console.log(`Processing ${type} document: ${id}`);
  const drafts = getStore("drafts");
  
  try {
    await drafts.set(`${id}-status`, JSON.stringify({ 
      status: 'processing', 
      step: 'initializing',
      message: 'Starting document conversion...',
      progress: 10,
      timestamp: new Date().toISOString() 
    }));
    
    let imageMapping = {};
    if (type === 'notion') {
      await drafts.set(`${id}-status`, JSON.stringify({ 
        status: 'processing', 
        step: 'processing_images',
        message: 'Downloading and processing images...',
        progress: 30,
        timestamp: new Date().toISOString() 
      }));
      
      try {
        const docData = JSON.parse(doc);
        if (docData.children && docData.children.results) {
          const title = docData.properties?.title?.title?.[0]?.text?.content ||
                        docData.properties?.Title?.title?.[0]?.text?.content ||
                        docData.properties?.Name?.title?.[0]?.text?.content ||
                        'untitled';
          console.log(`Processing images for document: ${title}`);
          imageMapping = await processNotionImages(docData.children.results, title);
          console.log(`Downloaded ${Object.keys(imageMapping).length} images`);
        }
      } catch (imageError: any) {
        console.error('Image processing failed, continuing without images:', imageError);
      }
    }
    
    await drafts.set(`${id}-status`, JSON.stringify({ 
      status: 'processing', 
      step: 'ai_conversion',
      message: 'Converting content with AI...',
      progress: 60,
      timestamp: new Date().toISOString() 
    }));
    
    const result = await convertToMetadataAndMarkdown(openai, type, doc, id);

    await drafts.set(`${id}-status`, JSON.stringify({ 
      status: 'processing', 
      step: 'finalizing',
      message: 'Finalizing content and saving...',
      progress: 90,
      timestamp: new Date().toISOString() 
    }));

    const finalMarkdown = Object.keys(imageMapping).length > 0 
      ? processMarkdownImages(result.markdown, imageMapping)
      : result.markdown;

    await drafts.set(id, JSON.stringify({
      meta: result.meta,
      markdown: finalMarkdown
    }));

    await drafts.set(`${id}-status`, JSON.stringify({ 
      status: 'done', 
      step: 'complete',
      message: 'Document processing complete!',
      progress: 100,
      timestamp: new Date().toISOString() 
    }));

    console.log(`Successfully processed ${type} document: ${id}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Processing error:', error);
    await drafts.set(`${id}-status`, JSON.stringify({ 
      status: 'error', 
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString() 
    }));
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export const config: Config = {
  path: '/api/process-document-background'
};