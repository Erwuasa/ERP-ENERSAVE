import type { Contract } from "../../types/contract"
import type { EstudioAhorroInput, PeriodoTarifa } from "./estudio-ahorro-types"
import type { TarifaRecommendation } from "../tarifa-recommendation"
import {
  calcularCosteAnualDesdeMarco,
  calcularCosteAnualFallbackMercado,
  contractPeaje,
  normalizePeaje,
} from "../tarifa-cost-calculator"
import { resolveMarcoCatalogEntry } from "../supabase/marco-retributivo"
import type { MarcoRetributivoRow } from "../supabase/marco-retributivo"

const PERIODOS: PeriodoTarifa[] = ["P1", "P2", "P3", "P4", "P5", "P6"]
const IVA_PCT = 21

function formatFechaGeneracion(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())
}

function buildTarifaFromBreakdown(
  comercializadora: string,
  nombreTarifa: string,
  breakdown: ReturnType<typeof calcularCosteAnualDesdeMarco>,
  peaje: string
): EstudioAhorroInput["tarifaActual"] {
  const count = normalizePeaje(peaje) === "2.0TD" ? 3 : 6
  const terminoPotencia = PERIODOS.slice(0, count).map((periodo, idx) => ({
    periodo,
    potenciaContratadaKw: breakdown.potencias[idx] ?? 0,
    precioEurDia: breakdown.potenciaRates[idx] ?? 0,
    total: (breakdown.potencias[idx] ?? 0) * (breakdown.potenciaRates[idx] ?? 0) * 365,
  }))
  const terminoEnergia = PERIODOS.slice(0, count).map((periodo, idx) => ({
    periodo,
    consumoKwh: breakdown.consumos[idx] ?? 0,
    precioEurKwh: breakdown.energiaRates[idx] ?? 0,
    total: (breakdown.consumos[idx] ?? 0) * (breakdown.energiaRates[idx] ?? 0),
  }))
  const baseImponible = breakdown.totalAnual
  const iva = baseImponible * (IVA_PCT / 100)

  return {
    comercializadora,
    nombreTarifa,
    terminoPotencia,
    terminoEnergia,
    otrosConceptos:
      breakdown.alquilerAnual > 0
        ? [
            {
              concepto: "Alquiler equipo",
              precio: breakdown.alquilerAnual / 12,
              total: breakdown.alquilerAnual,
            },
          ]
        : [],
    ivaPct: IVA_PCT,
    totalFactura: baseImponible + iva,
  }
}

function findMarcoRow(
  marcoEntries: MarcoRetributivoRow[],
  contract: Contract,
  recommendation: TarifaRecommendation
): MarcoRetributivoRow | null {
  return (
    marcoEntries.find((e) => e.id === recommendation.tarifaRecomendadaId) ??
    marcoEntries.find(
      (e) =>
        e.compania === recommendation.companiaRecomendada &&
        e.tarifa === recommendation.tarifaRecomendadaNombre
    ) ??
    null
  )
}

function findCurrentMarcoRow(
  marcoEntries: MarcoRetributivoRow[],
  contract: Contract
): MarcoRetributivoRow | null {
  if (contract.marcoEntryId) {
    const byId = marcoEntries.find((e) => e.id === contract.marcoEntryId)
    if (byId) return byId
  }
  const catalog = resolveMarcoCatalogEntry(
    contract.marcoEntryId,
    contract.compania,
    contract.tarifa,
    contract.tipo,
    marcoEntries
  )
  if (!catalog) return null
  return (
    marcoEntries.find(
      (e) =>
        e.compania === catalog.compania &&
        e.tarifa === catalog.tarifa &&
        e.tipo === catalog.tipo
    ) ?? null
  )
}

export function mapRecommendationToEstudioAhorro(
  contract: Contract,
  recommendation: TarifaRecommendation,
  marcoEntries: MarcoRetributivoRow[]
): EstudioAhorroInput {
  const peaje = contractPeaje(contract)
  const proposedRow = findMarcoRow(marcoEntries, contract, recommendation)
  const currentRow = findCurrentMarcoRow(marcoEntries, contract)

  const proposedBreakdown = proposedRow
    ? calcularCosteAnualDesdeMarco(proposedRow, contract)
    : calcularCosteAnualFallbackMercado(contract)

  const currentBreakdown = currentRow
    ? calcularCosteAnualDesdeMarco(currentRow, contract)
    : calcularCosteAnualFallbackMercado(contract)

  const tarifaActual = buildTarifaFromBreakdown(
    contract.compania,
    contract.tarifa,
    { ...currentBreakdown, totalAnual: recommendation.costeActualAnual },
    peaje
  )
  const tarifaPropuesta = buildTarifaFromBreakdown(
    recommendation.companiaRecomendada,
    recommendation.tarifaRecomendadaNombre,
    { ...proposedBreakdown, totalAnual: recommendation.costeNuevoAnual },
    peaje
  )

  const ahorroPorFacturaEur = Math.max(
    0,
    tarifaActual.totalFactura - tarifaPropuesta.totalFactura
  )
  const ahorroPorFacturaPct =
    tarifaActual.totalFactura > 0
      ? (ahorroPorFacturaEur / tarifaActual.totalFactura) * 100
      : 0

  return {
    cliente: {
      nombre: contract.clientName,
      cups: contract.cups,
      direccion: contract.direccionSuministro ?? contract.direccionCompleta,
    },
    fechaGeneracion: formatFechaGeneracion(),
    tarifaActual,
    tarifaPropuesta,
    ahorroPorFacturaEur,
    ahorroPorFacturaPct,
    ahorroAnualEur: recommendation.ahorroAnualEur,
    ahorroAnualPct: recommendation.ahorroPct,
  }
}

export function recommendationPdfFilename(
  recommendation: TarifaRecommendation
): string {
  const cups = (recommendation.cupsCode || "cups")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .slice(0, 24)
  const compania = recommendation.companiaRecomendada
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
  return `estudio_ahorro_${cups}_${compania}.pdf`
}
