/* ──────────────────────────────────────────────────────────────
 * API / HTTP Types
 * ────────────────────────────────────────────────────────────── */

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  error?: string | null;
}

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}
