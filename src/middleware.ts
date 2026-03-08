import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Static assets with content hashes are immutable — let Next.js default cache headers apply
  const path = request.nextUrl.pathname;
  if (path.includes('/_next/static/')) {
    return response;
  }

  // HTML pages and API routes must not be cached to prevent
  // stale chunk references after rebuilds
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.delete('x-nextjs-cache');

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static assets
    '/((?!_next/static|favicon.ico).*)',
  ],
};
