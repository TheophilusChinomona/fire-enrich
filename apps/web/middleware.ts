import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge-runtime shape gate.
 *
 * Runs in the Edge runtime (no `pg`, no `node:crypto.scrypt`), so this
 * file ONLY does cheap presence/format checks and short-circuits with a
 * 401 when they fail. The DB lookup + scrypt verification happen in the
 * Node-runtime route handler via `requireBearer` from @fire-enrich/core.
 *
 *   /api/firecrawl/* — must carry `Authorization: Bearer fe_...`.
 *   /admin/*         — must carry the `__fe_admin` cookie.
 *
 * Anything else falls through untouched.
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/firecrawl/')) {
    const auth = req.headers.get('authorization') ?? '';
    if (!/^Bearer\s+fe_\S+$/i.test(auth)) {
      return NextResponse.json(
        { code: 'unauthorized', error: 'missing or malformed bearer token' },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin/')) {
    // The login page itself doesn't require the cookie.
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return NextResponse.next();
    }
    const cookie = req.cookies.get('__fe_admin');
    if (!cookie?.value) {
      // Bounce admins to the login page; 401 routes go through
      // /api/admin/* which handle their own gating.
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.search = '';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/firecrawl/:path*', '/admin/:path*'],
};
