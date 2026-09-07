import type { Contract } from "../types/contract"

const REFERENCIA_PATTERN = /^([A-Z]{2})\s-\s(\d{3})$/

export function formatContractReferencia(prefix: string, sequence: number): string {
  const letters = prefix.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2).padEnd(2, "X")
  const num = Math.max(0, Math.min(999, Math.floor(sequence)))
  return `${letters} - ${String(num).padStart(3, "0")}`
}

export function referenciaPrefixFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? "E"}${parts[1]![0] ?? "S"}`.toUpperCase()
  }
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase()
  if (clean.length >= 2) return clean.slice(0, 2)
  return (clean + "ES").slice(0, 2).padEnd(2, "X")
}

export function parseContractReferencia(value: string): { prefix: string; sequence: number } | null {
  const match = value.trim().match(REFERENCIA_PATTERN)
  if (!match) return null
  return { prefix: match[1]!, sequence: Number(match[2]) }
}

export function deriveContractReferenciaFromId(contractId: string): string {
  let hash = 0
  for (let i = 0; i < contractId.length; i++) {
    hash = (hash * 31 + contractId.charCodeAt(i)) >>> 0
  }
  const first = String.fromCharCode(65 + (hash % 26))
  const second = String.fromCharCode(65 + ((hash >> 5) % 26))
  const sequence = (hash % 900) + 100
  return formatContractReferencia(`${first}${second}`, sequence)
}

export function allocateContractReferencia(
  prefix: string,
  existingReferencias: string[]
): string {
  const normalizedPrefix = referenciaPrefixFromName(prefix)
  let maxSequence = 0

  for (const ref of existingReferencias) {
    const parsed = parseContractReferencia(ref)
    if (!parsed || parsed.prefix !== normalizedPrefix) continue
    maxSequence = Math.max(maxSequence, parsed.sequence)
  }

  return formatContractReferencia(normalizedPrefix, maxSequence + 1)
}

export function resolveContractReferencia(contract: Contract | undefined): string {
  if (contract?.referencia?.trim()) return contract.referencia.trim()
  if (!contract?.id) return "—"
  return deriveContractReferenciaFromId(contract.id)
}

export function collectExistingReferencias(contracts: Contract[]): string[] {
  return contracts
    .map((contract) => contract.referencia?.trim())
    .filter((value): value is string => Boolean(value))
}

export function liquidacionRowMatchesSearch(
  row: {
    contractReferencia: string
    clientName: string
    cups: string
    direccion: string
    segmento: string
    compania: string
    tarifa: string
    comercialName: string
    comision: number
    settlement: { estado: string; descripcion: string }
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    row.contractReferencia,
    row.clientName,
    row.cups,
    row.direccion,
    row.segmento,
    row.compania,
    row.tarifa,
    row.comercialName,
    row.settlement.estado,
    row.settlement.descripcion,
    String(row.comision),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(q)
}
