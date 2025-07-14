import type { Config, Context } from "@netlify/functions";
import { Client } from '@notionhq/client';

export default async (req: Request, context: Context) => {
  const notion = new Client({ auth: Netlify.env.get('NOTION_API_KEY') });
  
  // Get specific page content
  if (context.params.id) {
    try {
      console.log(`Fetching Notion page: ${context.params.id}`);
      
      const pageProperties = await notion.pages.retrieve({ 
        page_id: context.params.id 
      });
      
      console.log(`Fetching children blocks for page: ${context.params.id}`);
      const children = await notion.blocks.children.list({ 
        block_id: context.params.id 
      });
      
      console.log(`Successfully fetched page with ${children.results.length} blocks`);
      
      return new Response(JSON.stringify({
        properties: pageProperties, 
        children: children
      }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Notion API error:', error);
      const errorMessage = error.message || 'Unknown error fetching page';
      return new Response(JSON.stringify({ 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR'
      }), { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  // Search pages
  const searchTerm = new URL(req.url).searchParams.get('s');
  if (!searchTerm) {
    return new Response('Search term required', { status: 400 });
  }

  try {
    console.log(`Searching Notion for: ${searchTerm}`);
    const searchResults = await notion.search({ query: searchTerm });
    
    const pages = searchResults.results.map((page: any) => {
      let title = page.properties.title || page.properties.Title || page.properties.Name;
      if (!title) {
        for (const key in page.properties) {
          if (page.properties[key].title) {
            title = page.properties[key];
            break;
          }
        }
      }
      return {
        id: page.id,
        name: title?.title?.map((t: any) => t.text.content).join('') || 'Untitled'
      };
    });

    console.log(`Found ${pages.length} pages for search: ${searchTerm}`);
    return new Response(JSON.stringify(pages), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Notion search error:', error);
    const errorMessage = error.message || 'Unknown search error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: error.code || 'SEARCH_ERROR'
    }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const config: Config = {
  path: "/api/notion/:id?"
};