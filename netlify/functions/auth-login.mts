import type { Config } from "@netlify/functions";
import { randomUUID } from 'crypto';

export default async function handler(req: Request) {
  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  if (!clientId) {
    return new Response('GitHub OAuth not configured', { status: 500 });
  }

  const state = randomUUID();
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', `${new URL(req.url).origin}/api/auth/callback`);
  githubAuthUrl.searchParams.set('scope', 'user:email,repo');
  githubAuthUrl.searchParams.set('state', state);

  return new Response('Redirecting to GitHub...', {
    status: 302,
    headers: { 'Location': githubAuthUrl.toString() }
  });
}

export const config: Config = {
  path: "/api/auth/login"
};