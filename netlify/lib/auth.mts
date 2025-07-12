import jwt from 'jsonwebtoken';

export interface AuthUser {
  user: string;
  github_token: string;
}

export function verifyAuth(request: Request): AuthUser | null {
  const { JWT_SECRET } = process.env;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('='))
  );

  const token = cookies.auth_token;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}