/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_KEY: string;
  readonly VITE_ADMIN_KEY: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_BACKEND_API: string;
  readonly VITE_API_TIMEOUT_MS: string;
  readonly VITE_API_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
