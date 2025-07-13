import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  if (!clientId) {
    return new Response('Missing GitHub client ID', { status: 500 });
  }

  const scopes = 'user:email,repo';
  const redirectUri = `${new URL(request.url).origin}/.netlify/functions/auth-callback`;

  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}`;

  return Response.redirect(authUrl);
};