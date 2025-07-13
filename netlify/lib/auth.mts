import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

export interface AuthPayload {
  user: AuthUser;
  github_token: string;
}

export function parseAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('='))
  );

  return cookies.auth_token || null;
}

export function verifyAuth(token: string): AuthPayload | null {
  const jwtSecret = Netlify.env.get('JWT_SECRET');
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    return jwt.verify(token, jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): AuthPayload {
  const token = parseAuthCookie(request);
  if (!token) {
    throw new Error('No authentication token');
  }

  const auth = verifyAuth(token);
  if (!auth) {
    throw new Error('Invalid authentication token');
  }

  return auth;
}