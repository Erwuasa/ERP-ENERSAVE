import { useMemo, useState } from "react"
import {
  getCashflowKpiValues,
  type CashflowScenario,
} from "@/lib/erp/cashflow-demo-data"
import {
  buildContractsById,
  calcularCashflow16Semanas,
  DEFAULT_GASTOS_FIJOS_MENSUALES,
  partitionSettlementsForCashflow,
} from "@/lib/cashflow-forecast"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

export function useCashflowPanel(
  cashflowScenario: CashflowScenario,
  contracts: Contract[] = [],
  settlements: Settlement[] = []
) {
  const [projectionOpen, setProjectionOpen] = useState(true)
  const [canalSearch, setCanalSearch] = useState("")
  const [selectedContraparte, setSelectedContraparte] = useState<string | null>(null)

  const kpi = useMemo(() => getCashflowKpiValues(cashflowScenario), [cashflowScenario])

  const { liquidacionesPendientesCobro, comisionesPendientesPago, settlementsPagados } =
    useMemo(() => partitionSettlementsForCashflow(settlements), [settlements])

  const saldoActual = useMemo(() => {
    const cobrado = settlementsPagados.reduce(
      (sum, item) => sum + (item.montoInterno ?? 0),
      0
    )
    const pagado = settlementsPagados.reduce(
      (sum, item) => sum + (item.montoExterno ?? 0),
      0
    )
    return 42_000 + cobrado - pagado
  }, [settlementsPagados])

  const semanasCashflow = useMemo(
    () =>
      calcularCashflow16Semanas(
        saldoActual,
        liquidacionesPendientesCobro,
        comisionesPendientesPago,
        DEFAULT_GASTOS_FIJOS_MENSUALES,
        new Date(),
        {
          contractsById: buildContractsById(contracts),
          settlementsPagados,
          scenario: cashflowScenario,
        }
      ),
    [
      saldoActual,
      liquidacionesPendientesCobro,
      comisionesPendientesPago,
      contracts,
      settlementsPagados,
      cashflowScenario,
    ]
  )

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
    semanasCashflow,
    saldoActual,
  }
}
