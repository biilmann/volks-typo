import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const { GITHUB_CLIENT_ID } = process.env;
  if (!GITHUB_CLIENT_ID) {
    return new Response('Missing GitHub client ID', { status: 500 });
  }

  const scopes = 'user:email,repo';
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;

  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}`;

  return Response.redirect(authUrl);
};