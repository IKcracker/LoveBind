import { apiConnectionHelp, resolveApiBaseUrl } from './api-url';

export type ApiMethod = 'GET' | 'POST' | 'PUT';
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiAddress(): string {
  return resolveApiBaseUrl().url;
}

export async function apiRequest<T>(
  path: string, method: ApiMethod = 'GET', body?: unknown, token?: string,
): Promise<T> {
  let base: string;
  try {
    base = getApiAddress();
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Invalid API configuration.');
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
      const friendly = response.status >= 500
        ? 'The API is reachable, but its server encountered an error. Check the backend logs and database tables.'
        : detail;
      throw new ApiError(friendly, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('The API at ' + base + ' timed out. Check whether the backend is running and reachable from this device.');
    }
    throw new ApiError(apiConnectionHelp(error, base));
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkApiHealth(): Promise<{ url: string; database: 'connected' }> {
  const url = getApiAddress();
  const api = await apiRequest<{ status: string }>('/health');
  if (api.status !== 'ok') throw new ApiError('The API returned an unexpected health response.');
  try {
    const db = await apiRequest<{ status: string }>('/health/db');
    if (db.status !== 'ok') throw new ApiError('The database health check failed.');
    const ready = await apiRequest<{ status: string }>('/health/ready');
    if (ready.status !== 'ok') throw new ApiError('Required database tables are unavailable.');
  } catch (error) {
    throw new ApiError(
      'The API is reachable at ' + url + ', but PostgreSQL or the registration tables are not ready. Check the Neon connection in server/.env.local, then initialize the development schema.',
      error instanceof ApiError ? error.status : undefined,
    );
  }
  return { url, database: 'connected' };
}
