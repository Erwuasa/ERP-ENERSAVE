/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL?: string
  readonly SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_PRODUCT_NAME: string
  readonly GEMINI_API_KEY?: string
  readonly VITE_GEMINI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
