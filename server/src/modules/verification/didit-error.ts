import { BadGatewayException, Logger } from '@nestjs/common';

export type DiditAction = 'create-session' | 'fetch-decision';

export function diditFailure(status: number): { code: string; message: string } {
  switch (status) {
    case 400:
    case 422:
      return {
        code: 'DIDIT_REQUEST_REJECTED',
        message: 'Didit rejected the verification workflow or request. Check that the workflow ID belongs to the active Didit application and is configured correctly.',
      };
    case 401:
      return {
        code: 'DIDIT_KEY_REJECTED',
        message: 'Didit rejected the API key. Check that the current application API key (not the webhook secret) is configured on Render.',
      };
    case 403:
      return {
        code: 'DIDIT_PERMISSION_DENIED',
        message: 'Didit denied access. Check that the API key and workflow belong to the same application and environment, and that the application has permission.',
      };
    case 404:
      return {
        code: 'DIDIT_WORKFLOW_NOT_FOUND',
        message: 'Didit could not find the workflow or session for this application. Check the workflow ID and application selection.',
      };
    case 402:
      return {
        code: 'DIDIT_INSUFFICIENT_CREDITS',
        message: 'Didit could not start verification because the application may need additional credits.',
      };
    case 429:
      return {
        code: 'DIDIT_RATE_LIMIT',
        message: 'Didit is limiting verification requests. Please try again later.',
      };
    default:
      return status >= 500
        ? { code: 'DIDIT_UPSTREAM_ERROR', message: 'Didit is temporarily unavailable. Please try again later.' }
        : { code: 'DIDIT_UNEXPECTED_STATUS', message: 'Didit rejected this verification request. Check the backend diagnostics for its HTTP status.' };
  }
}

function safeProviderCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return;
  const obj = body as Record<string, unknown>;
  // Only log short machine-readable codes; never log error text, IDs or documents.
  const code = obj.code ?? obj.error_code;
  return typeof code === 'string' && /^[a-z][a-z0-9_]{1,39}$/i.test(code) ? code : undefined;
}

export async function fetchDidit(url: string, init: RequestInit, action: DiditAction): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    // Never print the request object, headers, URL query, or upstream response body.
    Logger.warn('Didit ' + action + ': network failure (' + (error instanceof Error ? error.name : 'unknown') + ')', 'Didit');
    throw new BadGatewayException({
      code: 'DIDIT_NETWORK_FAILURE',
      message: 'Unable to reach Didit. Check the backend network connection and try again.',
    });
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const providerCode = safeProviderCode(body);
    Logger.warn(
      'Didit ' + action + ': upstream HTTP ' + response.status + (providerCode ? ' code=' + providerCode : ''),
      'Didit',
    );
    throw new BadGatewayException(diditFailure(response.status));
  }
  return response;
}

export function hostedDiditUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  // Didit may return verify.didit.me/... without an explicit protocol.
  const normalized = candidate.startsWith('verify.didit.me/') || candidate.startsWith('verify.didit.me?')
    ? 'https://' + candidate : candidate;
  let url: URL;
  try { url = new URL(normalized); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || (host !== 'didit.me' && !host.endsWith('.didit.me')) ||
      url.username || url.password || url.port) return null;
  return url.toString();
}
