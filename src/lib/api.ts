export type ApiMethod = 'GET' | 'POST' | 'PUT';
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string, method: ApiMethod = 'GET', body?: unknown, token?: string,
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (!base) throw new ApiError('API address not configured. Set EXPO_PUBLIC_API_URL in .env.local.');
  if (!/^https?:\/\//.test(base)) throw new ApiError('EXPO_PUBLIC_API_URL must be an absolute URL.');
  if (!__DEV__ && !base.startsWith('https://')) {
    throw new ApiError('A secure HTTPS API address is required.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(base + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const obj = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
      const message = obj?.message;
      const detail = typeof message === 'string' ? message
        : Array.isArray(message) ? message.filter((x): x is string => typeof x === 'string').join(', ')
        : 'Request failed. Try again.';
      throw new ApiError(response.status >= 500 ? 'Service temporarily unavailable. Please try again.' : detail, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('Connection timed out. Check your network.');
    throw new ApiError('Cannot reach LoveBind API. Check the server and network address.');
  } finally {
    clearTimeout(timeout);
  }
}
