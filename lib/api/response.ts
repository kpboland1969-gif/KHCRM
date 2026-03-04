import { NextResponse } from 'next/server';

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };

export function jsonOk<T>(data: T, init?: { status?: number }): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true, data }, { status: init?.status ?? 200 });
}

export function jsonErr(
  error: string,
  init: { status: number; code?: string },
): NextResponse<ApiErr> {
  const payload: ApiErr = { ok: false, error };
  if (init.code) payload.code = init.code;
  return NextResponse.json(payload, { status: init.status });
}

export function safeErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Unknown error';
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as any).message === 'string'
  ) {
    return (err as any).message;
  }
  return 'Unknown error';
}
