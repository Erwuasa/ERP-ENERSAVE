/**
 * Punto de entrada único del cliente Supabase.
 * Migración gradual: los módulos en lib/supabase/ re-exportan aquí hasta completar el refactor.
 */
export {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../lib/supabase/client"
