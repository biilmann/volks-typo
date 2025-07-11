import type { Context } from '@netlify/functions';

export default async (_request: Request, context: Context) => {
  const headers = new Headers();
  headers.set(
    'Set-Cookie',
    'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
  headers.set('Location', '/admin');
  return new Response(null, { status: 302, headers });
};