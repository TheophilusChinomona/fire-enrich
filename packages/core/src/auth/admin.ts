import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = '__fe_admin';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class AdminUnauthorizedError extends Error {
  readonly code = 'admin_unauthorized' as const;
  constructor(reason: string) {
    super(`Admin unauthorized: ${reason}`);
  }
}

function getAdminToken(): string {
  const t = process.env.ADMIN_TOKEN;
  if (!t) throw new Error('ADMIN_TOKEN env var not set');
  return t;
}

function getCookieSecret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s) throw new Error('ADMIN_COOKIE_SECRET env var not set');
  return s;
}

/**
 * Verify a plaintext admin token and mint a Set-Cookie header that
 * authenticates the admin for `TTL_SECONDS`.
 *
 * Single-admin model: ADMIN_TOKEN env stores the plaintext (rotation =
 * env-var update + redeploy). At this scale (one admin) hashing the env
 * value adds no real security: an attacker who can read env vars has
 * already won. We use timingSafeEqual on the comparison anyway to keep
 * the auth path uniform.
 */
export async function loginAdmin(plaintext: string): Promise<string> {
  const expected = Buffer.from(getAdminToken());
  const provided = Buffer.from(plaintext);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new AdminUnauthorizedError('invalid admin token');
  }
  return mintCookie();
}

/**
 * Verify the request's `__fe_admin` cookie. Throws AdminUnauthorizedError
 * if missing, malformed, expired, or the HMAC signature doesn't match.
 */
export function requireAdmin(headers: Headers): void {
  const cookieHeader = headers.get('cookie') ?? '';
  const value = pickCookie(cookieHeader, ADMIN_COOKIE_NAME);
  if (!value) throw new AdminUnauthorizedError('no admin cookie');

  let parsed: { exp: unknown; sig: unknown };
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    throw new AdminUnauthorizedError('malformed admin cookie');
  }

  if (typeof parsed.exp !== 'number' || typeof parsed.sig !== 'string') {
    throw new AdminUnauthorizedError('malformed admin cookie');
  }
  if (parsed.exp < Date.now()) {
    throw new AdminUnauthorizedError('admin cookie expired');
  }

  const expectedSig = signExp(parsed.exp);
  const actualBuf = Buffer.from(parsed.sig, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    throw new AdminUnauthorizedError('admin cookie signature mismatch');
  }
}

function mintCookie(): string {
  const exp = Date.now() + TTL_SECONDS * 1000;
  const sig = signExp(exp);
  const value = Buffer.from(JSON.stringify({ exp, sig })).toString('base64');
  return [
    `${ADMIN_COOKIE_NAME}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${TTL_SECONDS}`,
    'Secure',
  ].join('; ');
}

function signExp(exp: number): string {
  return createHmac('sha256', getCookieSecret())
    .update(String(exp))
    .digest('base64url');
}

function pickCookie(cookieHeader: string, name: string): string | null {
  // Cookies are `k=v; k=v` with optional whitespace around the separators.
  for (const pair of cookieHeader.split(';')) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1);
    }
  }
  return null;
}
