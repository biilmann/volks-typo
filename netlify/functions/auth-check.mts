import type { Config } from "@netlify/functions";
import { requireAuth } from '../lib/auth.mts';

export default async function handler(req: Request) {
  const auth = requireAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ authenticated: true, user: auth.user }), { headers: { 'content-type': 'application/json' } });
}

export const config: Config = {
  path: "/api/auth/check"
};