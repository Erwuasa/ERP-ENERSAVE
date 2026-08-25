import { createContext, useContext, type Dispatch, type SetStateAction } from "react"
import type { Aviso } from "@/types/aviso"
import type { CalendarioEvento } from "@/types/calendario"

export interface StaffFeedsContextValue {
  avisos: Aviso[]
  setAvisos: Dispatch<SetStateAction<Aviso[]>>
  calendarioEventos: CalendarioEvento[]
  setCalendarioEventos: Dispatch<SetStateAction<CalendarioEvento[]>>
  unviewedAvisos: Aviso[]
  markAvisosVistos: () => Promise<void>
}

export const StaffFeedsContext = createContext<StaffFeedsContextValue | null>(null)

export function useStaffFeeds(): StaffFeedsContextValue {
  const ctx = useContext(StaffFeedsContext)
  if (!ctx) throw new Error("useStaffFeeds debe usarse dentro de StaffFeedsProvider")
  return ctx
}
