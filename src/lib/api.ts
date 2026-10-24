import { apiConnectionHelp, resolveApiBaseUrl } from './api-url';

export type ApiMethod = 'GET' | 'POST' | 'PUT';
const providerErrorHelp: Record<string, string> = {
  DIDIT_REQUEST_REJECTED: 'Didit rejected the verification request. The workflow ID may be invalid or belong to a different application.',
  DIDIT_KEY_REJECTED: 'Didit rejected the API key. Please check the key in the active Render service.',
  DIDIT_PERMISSION_DENIED: 'Didit denied access. Please check the application and workflow permissions.',
  DIDIT_WORKFLOW_NOT_FOUND: 'The configured Didit workflow was not found. Check the workflow ID and application.',
  DIDIT_INSUFFICIENT_CREDITS: 'Didit may require more credits to start verification.',
  DIDIT_RATE_LIMIT: 'Too many verification attempts. Please try again later.',
  DIDIT_UPSTREAM_ERROR: 'Didit is temporarily unavailable. Please try again later.',
  DIDIT_UNEXPECTED_STATUS: 'Didit rejected this request. Check the backend logs for its HTTP status.',
  DIDIT_NETWORK_FAILURE: 'LoveBind could not reach Didit. Please try again later.',
  DIDIT_INVALID_RESPONSE: 'Didit sent an invalid verification link or response. Please contact support.',
};

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
      // Only surface our own known, safe provider diagnostics; do not pass
      // arbitrary 5xx or upstream response bodies to the user.
      const providerCode = typeof obj?.code === 'string' ? obj.code : '';
      const providerHelp = response.status === 502 && path.startsWith('/verification/')
        ? providerErrorHelp[providerCode] : undefined;
      const friendly = providerHelp ??
        (response.status >= 500
          ? 'The API encountered a server error. Please try again or check the backend logs.'
          : detail);
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
