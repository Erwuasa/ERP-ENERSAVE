import type { Contract } from "../types/contract"

export const RETRO_MESES_POR_COMPANIA: Record<string, number> = {
  endesa: 6,
  naturgy: 4,
  repsol: 4,
  iberdrola: 12,
  niba: 12,
  "gana energia": 12,
  "gana energía": 12,
}

const DEFAULT_RETRO_MESES = 6

function normalizeCompania(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function matchCompaniaKey(normalized: string): string | undefined {
  if (RETRO_MESES_POR_COMPANIA[normalized]) return normalized
  return Object.keys(RETRO_MESES_POR_COMPANIA).find((key) => normalized.includes(key))
}

export function getRetroMonths(compania: string): { meses: number; estimado: boolean } {
  const key = matchCompaniaKey(normalizeCompania(compania))
  if (key) return { meses: RETRO_MESES_POR_COMPANIA[key], estimado: false }
  return { meses: DEFAULT_RETRO_MESES, estimado: true }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function contractStartDate(contract: Contract): Date {
  const raw = contract.createdAt
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function getFechaFinRetro(contract: Contract): Date {
  const { meses } = getRetroMonths(contract.compania)
  return addMonths(contractStartDate(contract), meses)
}

export function getDiasRestantesRetro(
  contract: Contract,
  referenceDate: Date = new Date()
): number {
  const fin = getFechaFinRetro(contract)
  const diffMs = fin.getTime() - referenceDate.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function isRetroElegibleParaRecomendacion(
  contract: Contract,
  referenceDate: Date = new Date()
): boolean {
  return getDiasRestantesRetro(contract, referenceDate) <= 30
}
