import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import { calcularRecomendacionesParaContratos } from "@/lib/tarifa-recommendation"
import {
  dismissRecommendation,
  filterUndismissedRecommendations,
} from "@/lib/recommendation-dismissed"
import { dismissRenewalAlert } from "@/lib/renewal-alert-dismissed"
import { listMarcoRetributivoMatchingTariffs, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { listTariffsConPrecios } from "@/lib/supabase/tariffs-catalog"
import { contractPeaje } from "@/lib/tarifa-cost-calculator"
import { mapRecommendationToEstudioAhorro, recommendationPdfFilename } from "@/lib/pdf/map-recommendation-estudio-ahorro"
import { getDemoEstudioAhorroInput } from "@/lib/pdf/demo-estudio-ahorro-input"
import { downloadEstudioAhorroPdf, generateEstudioAhorroPdf } from "@/lib/pdf/estudio-ahorro-pdf"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

interface Params {
  visibleContracts: Contract[]
  profiles: ProfileOption[]
  formatCurrency: (value: number) => string
  enabled: boolean
  onCreateFromRecommendation: (contract: Contract, recommendation: TarifaRecommendation) => void
}

export function useContratosRecommendations({
  visibleContracts,
  profiles,
  formatCurrency,
  enabled,
  onCreateFromRecommendation,
}: Params) {
  const [marcoEntries, setMarcoEntries] = useState<MarcoRetributivoRow[]>([])
  const [dismissTick, setDismissTick] = useState(0)

  const peajeKey = useMemo(
    () =>
      [...new Set(visibleContracts.map((contract) => contractPeaje(contract)).filter(Boolean))]
        .sort()
        .join("|"),
    [visibleContracts]
  )

  useEffect(() => {
    if (!enabled || !peajeKey) return
    let cancelled = false
    void (async () => {
      const peajes = peajeKey.split("|")
      const listed = await Promise.all(
        peajes.flatMap((peaje) => [
          listTariffsConPrecios("residencial", peaje),
          listTariffsConPrecios("pyme", peaje),
        ])
      )
      if (cancelled) return
      const tariffs = listed.flatMap((result) => (result.ok ? result.data : []))
      const marco = await listMarcoRetributivoMatchingTariffs(tariffs)
      if (cancelled || marco.ok === false) return
      setMarcoEntries(marco.data)
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, peajeKey])

  const tarifaRecommendations = useMemo(() => {
    if (!enabled) return new Map<string, TarifaRecommendation>()
    const raw = calcularRecomendacionesParaContratos(
      visibleContracts,
      marcoEntries,
      profiles,
      formatCurrency
    )
    return filterUndismissedRecommendations(raw)
  }, [enabled, visibleContracts, marcoEntries, profiles, formatCurrency, dismissTick])

  const handleDismissRecommendation = useCallback((contractId: string) => {
    dismissRecommendation(contractId)
    setDismissTick((n) => n + 1)
  }, [])

  const handleDismissRenewal = useCallback((contractId: string) => {
    dismissRenewalAlert(contractId)
    setDismissTick((n) => n + 1)
  }, [])

  const handleDownloadRecommendationPdf = useCallback(
    async (contract: Contract, recommendation: TarifaRecommendation) => {
      const demoInput = getDemoEstudioAhorroInput({
        nombre: contract.clientName,
        cups: contract.cups,
        direccion: contract.direccionSuministro ?? contract.direccionCompleta,
      })
      try {
        let input = demoInput
        try {
          input = mapRecommendationToEstudioAhorro(contract, recommendation, marcoEntries)
        } catch (mapError) {
          console.warn("[PDF] Mapeo dinámico fallido, usando demo embebido", mapError)
        }
        const blob = await generateEstudioAhorroPdf(input)
        downloadEstudioAhorroPdf(blob, recommendationPdfFilename(recommendation))
        toast.success("PDF de estudio de ahorro generado")
      } catch (error) {
        console.error(error)
        try {
          const blob = await generateEstudioAhorroPdf(demoInput)
          downloadEstudioAhorroPdf(blob, recommendationPdfFilename(recommendation))
          toast.success("PDF de estudio de ahorro generado (plantilla demo)")
        } catch (fallbackError) {
          console.error(fallbackError)
          toast.error("No se pudo generar el PDF.")
        }
      }
    },
    [marcoEntries]
  )

  const handleCreateFromRecommendation = useCallback(
    (contract: Contract, recommendation: TarifaRecommendation) => {
      onCreateFromRecommendation(contract, recommendation)
    },
    [onCreateFromRecommendation]
  )

  return {
    tarifaRecommendations,
    handleDismissRecommendation,
    handleDismissRenewal,
    handleDownloadRecommendationPdf,
    handleCreateFromRecommendation,
  }
}
