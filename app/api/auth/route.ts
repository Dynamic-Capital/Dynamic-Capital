import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const res = NextResponse.json({ ok: true });
  if (token) {
    res.cookies.set('sb:token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('sb:token', '', {
    path: '/',
    maxAge: 0,
  });
  return res;
}
