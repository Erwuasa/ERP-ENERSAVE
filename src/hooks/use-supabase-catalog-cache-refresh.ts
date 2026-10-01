import { useEffect } from "react"
import { invalidateMarcoRetributivoCache } from "@/lib/supabase/marco-retributivo-cache"
import { invalidateAllTariffsCatalogCache } from "@/lib/supabase/tariffs-catalog-cache"

/** Al volver a la pestaña del ERP, fuerza relectura de tarifas y marco desde Supabase. */
export function useSupabaseCatalogCacheRefreshOnFocus() {
  useEffect(() => {
    function handleFocus() {
      invalidateMarcoRetributivoCache()
      invalidateAllTariffsCatalogCache()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])
}
