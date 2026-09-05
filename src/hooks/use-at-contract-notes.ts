import { useEffect, useState } from "react"
import {
  fetchAtContractExtras,
  type AtContractNote,
} from "@/lib/supabase/at-contract-notes"

export function useAtContractNotes(input: {
  atContractId?: string
  contratoId?: string
  initialNotes?: AtContractNote[]
  initialStatusNote?: string
  initialIncidentAt?: string
}) {
  const [notes, setNotes] = useState<AtContractNote[]>(input.initialNotes ?? [])
  const [statusNote, setStatusNote] = useState(input.initialStatusNote ?? "")
  const [incidentAt, setIncidentAt] = useState(input.initialIncidentAt ?? "")
  const [loading, setLoading] = useState(Boolean(input.atContractId))

  useEffect(() => {
    setNotes(input.initialNotes ?? [])
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
        if (result.data.statusNote) setStatusNote(result.data.statusNote)
        if (result.data.incidentAt) setIncidentAt(result.data.incidentAt)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [input.atContractId, input.contratoId])

  return { notes, statusNote, incidentAt, loading }
}
