import type { Config, Context } from "@netlify/functions";
import jwt from 'jsonwebtoken';

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    const headers = new Headers();
    headers.set('Location', '/admin/login.html?error=no_code');
    return new Response('Authorization code missing', { status: 302, headers });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Netlify.env.get('GITHUB_CLIENT_ID'),
        client_secret: Netlify.env.get('GITHUB_CLIENT_SECRET'),
        code: code,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData);
      return new Response('Authentication failed', { status: 400 });
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const userData = await userResponse.json();

    const { GITHUB_CONFIG } = await import('../lib/config.mts');
    if (!GITHUB_CONFIG.authorizedUsers.includes(userData.login)) {
      const headers = new Headers();
      headers.set('Location', '/admin/login.html?error=unauthorized');
      return new Response('Unauthorized user', { status: 302, headers });
    }

    const jwtSecret = Netlify.env.get('JWT_SECRET');
    if (!jwtSecret) {
      return new Response('JWT secret not configured', { status: 500 });
    }

    const token = jwt.sign(
      { user: { id: userData.id, login: userData.login, name: userData.name, email: userData.email }, github_token: tokenData.access_token },
      jwtSecret,
      { expiresIn: '24h' }
    );

    const headers = new Headers();
    headers.set('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
    headers.set('Location', '/admin/index.html');
    return new Response('Authentication successful', { status: 302, headers });
  } catch (error: any) {
    console.error('Auth callback error:', error);
    const headers = new Headers();
    headers.set('Location', '/admin/login.html?error=auth_failed');
    return new Response('Authentication failed', { status: 302, headers });
  }
}

export const config: Config = {
  path: "/api/auth/callback"
};