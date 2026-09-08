import { useEffect, useState } from "react"
import {
  fetchAtContractExtras,
  type AtContractDocument,
  type AtContractEmail,
  type AtContractEvent,
  type AtContractNote,
  type AtContractPrice,
} from "@/lib/supabase/at-contract-notes"

export function useAtContractNotes(input: {
  atContractId?: string
  contratoId?: string
  initialNotes?: AtContractNote[]
  initialEvents?: AtContractEvent[]
  initialDocuments?: AtContractDocument[]
  initialEmails?: AtContractEmail[]
  initialStatusNote?: string
  initialIncidentAt?: string
  initialPrices?: AtContractPrice[]
  initialActivationDate?: string
}) {
  const [notes, setNotes] = useState<AtContractNote[]>(input.initialNotes ?? [])
  const [events, setEvents] = useState<AtContractEvent[]>(input.initialEvents ?? [])
  const [documents, setDocuments] = useState<AtContractDocument[]>(input.initialDocuments ?? [])
  const [emails, setEmails] = useState<AtContractEmail[]>(input.initialEmails ?? [])
  const [prices, setPrices] = useState<AtContractPrice[]>(input.initialPrices ?? [])
  const [activationDate, setActivationDate] = useState(input.initialActivationDate ?? "")
  const [statusNote, setStatusNote] = useState(input.initialStatusNote ?? "")
  const [incidentAt, setIncidentAt] = useState(input.initialIncidentAt ?? "")
  const [loading, setLoading] = useState(Boolean(input.atContractId))

  useEffect(() => {
    setNotes(input.initialNotes ?? [])
    setEvents(input.initialEvents ?? [])
    setDocuments(input.initialDocuments ?? [])
    setEmails(input.initialEmails ?? [])
    setPrices(input.initialPrices ?? [])
    setActivationDate(input.initialActivationDate ?? "")
    setStatusNote(input.initialStatusNote ?? "")
    setIncidentAt(input.initialIncidentAt ?? "")
    if (!input.atContractId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchAtContractExtras({
      atContractId: input.atContractId,
      contratoId: input.contratoId,
    }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setNotes(result.data.notes)
        setEvents(result.data.events)
        setDocuments(result.data.documents)
        setEmails(result.data.emails)
        if (result.data.prices.length > 0) setPrices(result.data.prices)
        if (result.data.activationDate) setActivationDate(result.data.activationDate)
        if (result.data.statusNote) setStatusNote(result.data.statusNote)
        if (result.data.incidentAt) setIncidentAt(result.data.incidentAt)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [input.atContractId, input.contratoId])

  return { notes, events, documents, emails, prices, activationDate, statusNote, incidentAt, loading }
}
