import { useCallback, useEffect, useState } from "react"
import { DEMO_WEB_LEADS } from "../../demo/web-leads-seed"
import { getAuthSessionStatus } from "../../supabase/auth-session"
import {
  assignWebLead,
  convertWebLeadToProspecto,
  listWebLeadsInbox,
} from "../../supabase/web-leads"
import { isSupabaseConfigured } from "../../supabase/client"
import type { Prospecto } from "../types"
import type { WebLead } from "../web-leads"

export function useWebLeads() {
  const [leads, setLeads] = useState<WebLead[]>(() =>
    isSupabaseConfigured() ? [] : DEMO_WEB_LEADS
  )
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLeads(DEMO_WEB_LEADS)
      setLoading(false)
      setError(null)
      setNeedsAuth(false)
      return
    }

    setLoading(true)
    setError(null)

    const session = await getAuthSessionStatus()
    if (!session.ok) {
      setNeedsAuth(true)
      setError(
        "Sin sesión Supabase Auth. Los leads web solo son visibles para usuarios autenticados (RLS)."
      )
      setLeads([])
      setLoading(false)
      return
    }

    setNeedsAuth(false)
    const result = await listWebLeadsInbox()
    if (result.ok) {
      setLeads(result.data)
      if (result.data.length === 0) {
        setError(null)
      }
    } else {
      setError(result.message)
      setLeads([])
    }
    setLoading(false)
  }, [])

  const assign = useCallback(
    async (leadId: string, comercialId: string): Promise<{ ok: true; lead: WebLead } | { ok: false; message: string }> => {
      if (!isSupabaseConfigured()) {
        let updated: WebLead | undefined
        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== leadId) return lead
            updated = {
              ...lead,
              assignedComercialId: comercialId,
              assignedAt: new Date().toISOString(),
            }
            return updated
          })
        )
        return updated
          ? { ok: true, lead: updated }
          : { ok: false, message: "Lead no encontrado" }
      }

      const result = await assignWebLead(leadId, comercialId)
      if (result.ok === false) return { ok: false, message: result.message }
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? result.data : lead)))
      return { ok: true, lead: result.data }
    },
    []
  )

  const convert = useCallback(
    async (
      leadId: string
    ): Promise<
      | { ok: true; lead: WebLead; prospecto: Prospecto }
      | { ok: false; message: string }
    > => {
      if (!isSupabaseConfigured()) {
        return { ok: false, message: "Conversión requiere Supabase configurado" }
      }

      const result = await convertWebLeadToProspecto(leadId)
      if (result.ok === false) return { ok: false, message: result.message }
      setLeads((prev) => prev.filter((lead) => lead.id !== leadId))
      return result
    },
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return { leads, loading, error, needsAuth, refresh, assign, convert, setLeads }
}
