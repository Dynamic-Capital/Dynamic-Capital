import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from './utils/http';

export function middleware(req: NextRequest) {
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

export const config = {
  matcher: '/api/:path*',
};
