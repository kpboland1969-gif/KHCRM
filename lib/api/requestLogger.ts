import { safeErrorMessage } from '@/lib/api/response';
import { NextResponse } from 'next/server';

export async function withRequestLogging<T>(
  options: {
    route: string;
    userId?: string | null;
    leadId?: string | null;
  },
  handler: () => Promise<T>,
): Promise<T> {
  const { route, userId = null, leadId = null } = options;
  const start = Date.now();
  const requestId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  try {
    const result = await handler();
    const durationMs = Date.now() - start;
    // Log with requestId
    console.info({
      type: 'api_success',
      route,
      userId,
      leadId,
      durationMs,
      requestId,
    });

    // If result is a NextResponse, attach x-request-id header
    if (result instanceof NextResponse) {
      result.headers.set('x-request-id', requestId);
      // Optionally inject requestId into JSON body if possible
      try {
        const contentType = result.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const clone = result.clone();
          const body = await clone.json();
          if (typeof body === 'object' && body !== null) {
            body.requestId = requestId;
            // Recreate response with requestId injected
            const newResponse = NextResponse.json(body, { status: result.status });
            newResponse.headers.set('x-request-id', requestId);
            return newResponse as any as T;
          }
        }
      } catch {
        // If unable to inject, just return original response
      }
      return result;
    }
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    // Log with requestId
    console.error({
      type: 'api_error',
      route,
      userId,
      leadId,
      durationMs,
      requestId,
      error: safeErrorMessage(error),
    });
    // If error is a NextResponse, attach x-request-id header
    if (error instanceof NextResponse) {
      error.headers.set('x-request-id', requestId);
      try {
        const contentType = error.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const clone = error.clone();
          const body = await clone.json();
          if (typeof body === 'object' && body !== null) {
            body.requestId = requestId;
            const newResponse = NextResponse.json(body, { status: error.status });
            newResponse.headers.set('x-request-id', requestId);
            throw newResponse;
          }
        }
      } catch {
        // If unable to inject, just throw original response
      }
      throw error;
    }
    throw error;
  }
}
