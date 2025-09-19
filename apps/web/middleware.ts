import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from '@/utils/http.ts';
import createIntlMiddleware from 'next-intl/middleware';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config/localization';

const intlMiddleware = createIntlMiddleware({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
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
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
};
