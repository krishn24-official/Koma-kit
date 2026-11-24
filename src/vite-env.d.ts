/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Analytics 4 Measurement ID (G-XXXXXXXXXX); analytics stay off without it. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
