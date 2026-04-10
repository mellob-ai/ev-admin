function parseBoolean(input: unknown): boolean {
  const value = String(input ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function isApiIntegrationEnabled(): boolean {
  return true;
}

export function getApiBaseUrl(): string {
  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  return raw.replace(/\/$/, '');
}

export const API_REQUEST_TIMEOUT_MS: number = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
export const API_LOGGING_ENABLED: boolean = parseBoolean(import.meta.env.VITE_API_DEBUG);
