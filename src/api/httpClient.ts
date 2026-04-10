import type { HttpRequestOptions, ApiError } from '../types/api';
import { API_LOGGING_ENABLED, API_REQUEST_TIMEOUT_MS, getApiBaseUrl } from './runtime';

function withQuery(path: string, query: Record<string, string | number | boolean | undefined | null> = {}): string {
  const qp = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') return;
    qp.set(key, String(value));
  });
  const suffix = qp.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
  const baseUrl = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withParams = withQuery(normalized, query);
  if (!baseUrl) return withParams;
  return `${baseUrl}${withParams}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

export async function httpRequest({ method = 'GET', path, query, body, headers = {}, signal }: HttpRequestOptions): Promise<unknown> {
  const controller = signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS) : null;
  const finalSignal = signal || controller?.signal;

  try {
    const url = buildUrl(path, query);
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    const hasBody = body !== undefined;
    if (hasBody && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('mos.api.token');
    if (token && !requestHeaders.Authorization) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    // Backend requires X-Karma-App on all /v1 routes
    const appKey = import.meta.env.VITE_APP_KEY;
    if (appKey && !requestHeaders['X-Karma-App']) {
      requestHeaders['X-Karma-App'] = appKey;
    }

    // Backend requires X-Karma-Admin-Auth on admin routes
    const adminKey = import.meta.env.VITE_ADMIN_KEY;
    if (adminKey && !requestHeaders['X-Karma-Admin-Auth']) {
      requestHeaders['X-Karma-Admin-Auth'] = adminKey;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: finalSignal,
      credentials: 'include',
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const error: ApiError = new Error(
        (payload as Record<string, unknown>)?.message as string || `Request failed with status ${response.status}`
      );
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (API_LOGGING_ENABLED) {
      console.info('[API]', method, url, payload);
    }

    return payload;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
