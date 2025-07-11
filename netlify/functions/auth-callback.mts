import type { Context } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { GITHUB_CONFIG } from '../lib/config.mts';

export default async (request: Request, context: Context) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET } = process.env;
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
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!GITHUB_CONFIG.authorizedUsers.includes(userData.login)) {
      return Response.redirect('/admin?error=unauthorized');
    }

    const token = jwt.sign(
      {
        user: userData.login,
        github_token: tokenData.access_token,
      },
      JWT_SECRET!,
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