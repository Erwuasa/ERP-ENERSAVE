import { useCallback, useEffect, useState } from "react"
import { DEMO_ENERSAVE_LEADS } from "../../demo/enersave-leads-seed"
import { listEnersaveLeads } from "../../supabase/enersave-leads"
import { isSupabaseConfigured } from "../../supabase/client"
import type { EnersaveLead } from "../enersave-leads"

export function useEnersaveLeads() {
  const [leads, setLeads] = useState<EnersaveLead[]>(() =>
    isSupabaseConfigured() ? [] : DEMO_ENERSAVE_LEADS
  )
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLeads(DEMO_ENERSAVE_LEADS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const result = await listEnersaveLeads()
    if (result.ok) {
      setLeads(result.data.length > 0 ? result.data : DEMO_ENERSAVE_LEADS)
    } else {
      setError(result.message)
      setLeads(DEMO_ENERSAVE_LEADS)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { leads, loading, error, refresh, setLeads }
}
