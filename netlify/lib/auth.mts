import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  login: string;
  name: string;
  email: string;
}

export interface AuthPayload {
  user: AuthUser;
  github_token: string;
}

/**
 * Parse the auth_token cookie from the request headers.
 */
export function parseAuthCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return cookies.auth_token || null;
}

/**
 * Verify JWT token and return payload or null if invalid.
 */
export function verifyAuth(token: string): AuthPayload | null {
  try {
    const jwtSecret = Netlify.env.get('JWT_SECRET');
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return null;
    }
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Require authentication on a given request, return payload or null.
 */
export function requireAuth(request: Request): AuthPayload | null {
  const cookieHeader = request.headers.get('cookie');
  const token = parseAuthCookie(cookieHeader);
  if (!token) {
    return null;
  }
  return verifyAuth(token);
}