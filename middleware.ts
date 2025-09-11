import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from './utils/http';
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
  locales: ['en'],
  defaultLocale: 'en'
});

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const headers = buildCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
      if (origin && !headers['access-control-allow-origin']) {
        return new NextResponse(null, { status: 403 });
      }
      return new NextResponse(null, { status: 204, headers });
    }

    if (origin && !headers['access-control-allow-origin']) {
      return new NextResponse('Origin not allowed', { status: 403 });
    }

    const res = NextResponse.next();
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/', '/(en)/:path*', '/api/:path*'],
};
