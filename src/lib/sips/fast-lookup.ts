import { CUPS_ERROR_MESSAGES, normalizeCups, validateCups } from "@/lib/sips/cups"
import type { SipsOutcome, SipsProducto } from "@/lib/sips/types"

export type CupsLookupReadiness =
  | { state: "empty" }
  | { state: "incomplete" }
  | { state: "invalid"; message: string }
  | { state: "ready"; cups: string }

/** A CUPS is ready for SIPS only when the control letters match. Shorter text is still being typed. */
export function cupsLookupReadiness(value: string): CupsLookupReadiness {
  const cups = normalizeCups(value)
  if (!cups) return { state: "empty" }
  const checked = validateCups(cups)
  if (checked.ok === false) {
    if (cups.length < 20) return { state: "incomplete" }
    return { state: "invalid", message: CUPS_ERROR_MESSAGES[checked.reason] }
  }
  return { state: "ready", cups: checked.cups }
}

export function annualKwhFromSipsResumen(resumen: { consumoAnualKwh: number | null }): number | null {
  const value = resumen.consumoAnualKwh
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

const MEMORY = new Map<string, Extract<SipsOutcome, { status: "listo" }>>()

function memoryKey(producto: SipsProducto, cups: string): string {
  return `${producto}:${cups}`
}

export function recallSipsListo(
  producto: SipsProducto,
  cups: string
): Extract<SipsOutcome, { status: "listo" }> | null {
  return MEMORY.get(memoryKey(producto, cups)) ?? null
}

export function rememberSipsListo(
  producto: SipsProducto,
  outcome: Extract<SipsOutcome, { status: "listo" }>
): void {
  MEMORY.set(memoryKey(producto, outcome.cups), outcome)
}

export function clearSipsListoMemory(): void {
  MEMORY.clear()
}

const MAX_RETRY_MS = 3_000

/**
 * Memory, then a stored `listo` row, then the live lookup.
 * A `procesando` answer is retried once, and never waits more than 3 s.
 */
export async function resolveSipsLookup(input: {
  cups: string
  producto: SipsProducto
  readStored: () => Promise<SipsOutcome | null>
  fetchLive: () => Promise<SipsOutcome>
  wait: (ms: number) => Promise<void>
}): Promise<SipsOutcome> {
  const remembered = recallSipsListo(input.producto, input.cups)
  if (remembered) return remembered

  const stored = await input.readStored()
  if (stored?.status === "listo") {
    rememberSipsListo(input.producto, { ...stored, cups: stored.cups || input.cups })
    return recallSipsListo(input.producto, input.cups) ?? stored
  }

  let outcome = await input.fetchLive()
  if (outcome.status === "procesando") {
    const waitMs = Math.min(Math.max(outcome.reintentarEnSegundos, 1), MAX_RETRY_MS / 1000) * 1000
    await input.wait(waitMs)
    outcome = await input.fetchLive()
  }
  if (outcome.status === "listo") {
    rememberSipsListo(input.producto, { ...outcome, cups: outcome.cups || input.cups })
  }
  return outcome
}
