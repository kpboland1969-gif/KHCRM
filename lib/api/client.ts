export type ApiOk<T> = { ok: true; data: T; requestId?: string };
export type ApiErr = { ok: false; error: string; code?: string; requestId?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function getRetryAfterSeconds(res: Response): number | null {
  const v = res.headers.get('retry-after');
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.ceil(n);
}

export async function parseApiResponse<T>(res: Response): Promise<{
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
}> {
  const body = await res.json().catch(() => null);
  const headerRequestId = res.headers.get('x-request-id') ?? undefined;
  const bodyRequestId = body && typeof body.requestId === 'string' ? body.requestId : undefined;
  const requestId = bodyRequestId ?? headerRequestId;
  if (body && typeof body === 'object' && 'ok' in body) {
    return {
      ok: !!body.ok,
      data: body.data,
      error: body.error,
      code: body.code,
      requestId,
    };
  }
  return {
    ok: res.ok,
    error: 'Request failed',
    requestId,
  };
}

export function formatApiError(input: {
  error?: string;
  code?: string;
  requestId?: string;
  retryAfterSeconds?: number | null;
}): string {
  if (input.code === 'RATE_LIMITED' && input.retryAfterSeconds) {
    return `Too many requests. Try again in ${input.retryAfterSeconds} seconds.`;
  }
  return input.error || 'Request failed';
}
