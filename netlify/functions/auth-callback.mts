import type { Context } from '@netlify/functions';
import jwt from 'jsonwebtoken';

export default async (request: Request, context: Context) => {
  const clientId = Netlify.env.get('GITHUB_CLIENT_ID');
  const clientSecret = Netlify.env.get('GITHUB_CLIENT_SECRET');
  const jwtSecret = Netlify.env.get('JWT_SECRET');
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.redirect('/admin?error=no_code');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    const { GITHUB_CONFIG } = await import('../lib/config.mjs');
    if (!GITHUB_CONFIG.authorizedUsers.includes(userData.login)) {
      return Response.redirect('/admin?error=unauthorized');
    }

    const token = jwt.sign(
      {
        user: {
          id: userData.id,
          login: userData.login,
          name: userData.name,
          email: userData.email,
        },
        github_token: tokenData.access_token,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    const headers = new Headers();
    headers.set('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
    headers.set('Location', '/admin');

    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('Auth error:', error);
    return Response.redirect('/admin?error=auth_failed');
  }
};