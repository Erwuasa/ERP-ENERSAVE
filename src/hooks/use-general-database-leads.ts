import { useCallback, useEffect, useRef, useState } from "react"
import { DEMO_GENERAL_DATABASE_LEADS } from "../data/general-database-seed"
import {
  listGeneralDatabaseDistinctValues,
  listGeneralDatabaseLeads,
} from "../lib/supabase/general-database-leads"
import { isSupabaseConfigured } from "../lib/supabase/client"
import type { GeneralDatabaseFilters, GeneralDatabaseLead } from "../types/general-database"

const FILTER_DEBOUNCE_MS = 350

export interface GeneralDatabaseFilterOptions {
  provincias: string[]
  localidades: string[]
  cnaes: string[]
}

export function useGeneralDatabaseLeads(filters: GeneralDatabaseFilters) {
  const [leads, setLeads] = useState<GeneralDatabaseLead[]>(() =>
    isSupabaseConfigured() ? [] : DEMO_GENERAL_DATABASE_LEADS
  )
  const [filterOptions, setFilterOptions] = useState<GeneralDatabaseFilterOptions>({
    provincias: [],
    localidades: [],
    cnaes: [],
  })
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const loadFilterOptions = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      const provincias = new Set<string>()
      const localidades = new Set<string>()
      const cnaes = new Set<string>()
      for (const lead of DEMO_GENERAL_DATABASE_LEADS) {
        if (lead.provincia?.trim()) provincias.add(lead.provincia.trim())
        if (lead.localidad?.trim()) localidades.add(lead.localidad.trim())
        if (lead.cnae?.trim()) cnaes.add(lead.cnae.trim())
      }
      setFilterOptions({
        provincias: [...provincias].sort((a, b) => a.localeCompare(b, "es")),
        localidades: [...localidades].sort((a, b) => a.localeCompare(b, "es")),
        cnaes: [...cnaes].sort((a, b) => a.localeCompare(b, "es")),
      })
      return
    }

    const result = await listGeneralDatabaseDistinctValues()
    if (result.ok) setFilterOptions(result.data)
  }, [])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLeads(DEMO_GENERAL_DATABASE_LEADS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const result = await listGeneralDatabaseLeads(filtersRef.current)
    if (result.ok) {
      setLeads(result.data.length > 0 ? result.data : DEMO_GENERAL_DATABASE_LEADS)
    } else {
      setError(result.message)
      setLeads(DEMO_GENERAL_DATABASE_LEADS)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const timer = window.setTimeout(() => {
      void refresh()
    }, FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [filters, refresh])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
    }
  }, [])

  return { leads, filterOptions, loading, error, refresh }
}
