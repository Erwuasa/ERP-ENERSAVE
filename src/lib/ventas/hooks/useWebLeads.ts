import { useCallback, useEffect, useState } from "react"
import { DEMO_WEB_LEADS } from "../../demo/web-leads-seed"
import { getAuthSessionStatus } from "../../supabase/auth-session"
import {
  assignWebLead,
  convertWebLeadToProspecto,
  listWebLeadsInbox,
} from "../../supabase/web-leads"
import { inviteCustomerFromLead } from "../../supabase/invite-customer"
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
      return { ok: true, lead: result.data.lead, prospecto: result.data.prospecto }
    },
    []
  )

  const invite = useCallback(
    async (
      leadId: string
    ): Promise<
      | { ok: true; created: boolean; resent: boolean; invitedAt: string }
      | { ok: false; message: string }
    > => {
      if (!isSupabaseConfigured()) {
        const invitedAt = new Date().toISOString()
        let found = false
        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== leadId) return lead
            found = true
            return { ...lead, erpInvitedAt: invitedAt }
          })
        )
        return found
          ? { ok: true, created: true, resent: false, invitedAt }
          : { ok: false, message: "Lead no encontrado" }
      }

      const result = await inviteCustomerFromLead(leadId)
      if (result.ok === false) return result
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ||
          (result.email && lead.email?.toLowerCase() === result.email.toLowerCase())
            ? { ...lead, erpInvitedAt: result.invitedAt }
            : lead
        )
      )
      return {
        ok: true,
        created: result.created,
        resent: result.resent,
        invitedAt: result.invitedAt,
      }
    },
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return { leads, loading, error, needsAuth, refresh, assign, convert, invite, setLeads }
}
