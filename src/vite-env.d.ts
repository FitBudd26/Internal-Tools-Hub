/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' sends HubSpot events from `npm run dev` too (real submissions). */
  readonly VITE_TRACK_IN_DEV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
