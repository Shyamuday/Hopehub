export const DEFAULT_JWT_SECRET = 'dev-only-secret';
export const JWT_EXPIRY = '7d';
export const STORE_TOKEN_EXPIRY = '12h';
export const HR_JWT_EXPIRY = '12h';

export const AUTH_MESSAGES = {
  REQUIRED: 'Authentication required',
  INVALID_TOKEN: 'Invalid or expired token',
  INACTIVE_USER: 'User is inactive or missing',
  FORBIDDEN: 'You do not have access to this resource'
} as const;
