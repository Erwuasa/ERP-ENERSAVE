import { useMemo, useState } from "react"
import {
  getCashflowKpiValues,
  type CashflowScenario,
} from "@/lib/erp/cashflow-demo-data"

export function useCashflowPanel(cashflowScenario: CashflowScenario) {
  const [projectionOpen, setProjectionOpen] = useState(true)
  const [canalSearch, setCanalSearch] = useState("")
  const [selectedContraparte, setSelectedContraparte] = useState<string | null>(null)

  const kpi = useMemo(() => getCashflowKpiValues(cashflowScenario), [cashflowScenario])

  const pendientesPorCanal: { id: string; nombre: string; importe: number }[] = []
  const liquidacionesConsolidadas: { id: string; nombre: string; importe: number }[] = []

  const filteredPendientes = pendientesPorCanal.filter((item) =>
    item.nombre.toLowerCase().includes(canalSearch.trim().toLowerCase())
  )
  const filteredLiquidaciones = liquidacionesConsolidadas.filter((item) =>
    item.nombre.toLowerCase().includes(canalSearch.trim().toLowerCase())
  )

  return {
    projectionOpen,
    setProjectionOpen,
    canalSearch,
    setCanalSearch,
    selectedContraparte,
    setSelectedContraparte,
    kpi,
    filteredPendientes,
    filteredLiquidaciones,
  }
}
