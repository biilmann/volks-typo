import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async function handler(_: Request, context: Context) {
  const drafts = getStore("drafts");
  const id = context.params.id;
  
  try {
    const statusData = await drafts.get(`${id}-status`);
    if (statusData) {
      const status = JSON.parse(statusData);
      return new Response(JSON.stringify(status), {
        headers: { "content-type": "application/json" }
      });
    }
    const draft = await drafts.get(id);
    return new Response(JSON.stringify({
      status: draft ? "done" : "processing",
      timestamp: new Date().toISOString()
    }), {
      headers: { "content-type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      status: "error",
      error: "Failed to check status",
      timestamp: new Date().toISOString()
    }), {
      headers: { "content-type": "application/json" }
    });
  }
}

export const config: Config = {
  path: "/api/status/:id"
};