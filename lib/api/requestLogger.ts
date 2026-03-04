import { safeErrorMessage } from '@/lib/api/response';

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
  try {
    const result = await handler();
    const durationMs = Date.now() - start;
    console.info({
      type: 'api_success',
      route,
      userId,
      leadId,
      durationMs,
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error({
      type: 'api_error',
      route,
      userId,
      leadId,
      durationMs,
      error: safeErrorMessage(error),
    });
    throw error;
  }
}
