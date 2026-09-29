/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOOL_SOURCE?: string;
  /** 'true' sends HubSpot events from `npm run dev` too (real submissions). */
  readonly VITE_TRACK_IN_DEV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
