import type { Config } from "@netlify/functions";

// This function just queues the background processing
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { id, doc, type } = await req.json();
  
  console.log(`Queuing ${type} document for processing: ${id}`);
  
  try {
    const response = await fetch(
      `${Netlify.env.get('URL') || 'http://localhost:8888'}/api/process-document-background`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, doc, type })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to queue background processing');
    }

    return new Response(JSON.stringify({ success: true, processing: true }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Queuing error:', error);
    return new Response(JSON.stringify({ error: 'Failed to queue processing' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export const config: Config = {
  path: '/api/process-document'
};