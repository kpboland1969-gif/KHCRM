import { NextResponse } from 'next/server';

export async function POST() {
  // Best-effort cookie clearing for common Supabase cookie names.
  // HttpOnly cookies can only be cleared server-side.
  const res = NextResponse.json({ ok: true });

  const cookieNames = ['sb-access-token', 'sb-refresh-token'];

  for (const name of cookieNames) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }

  // Also clear any project-ref cookie variants (wildcards aren't possible; this is a best-effort baseline).
  // Client-side hardClear handles most cases; this just helps with HttpOnly.
  return res;
}
