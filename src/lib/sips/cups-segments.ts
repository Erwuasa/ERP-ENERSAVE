import { computeCupsControl, normalizeCups } from "./cups"

export type CupsSegmentKind = "country" | "digits" | "control" | "frontier"

export interface CupsSegment {
  kind: CupsSegmentKind
  text: string
  /** Only meaningful for the control segment: whether the letters match the digits. */
  valid?: boolean
}

/** Splits a (possibly partial) CUPS into the parts the plate displays: ES · 4-4-4-4 · control · frontier. */
export function splitCupsSegments(value: string): CupsSegment[] {
  const cups = normalizeCups(value)
  if (!cups) return []

  const segments: CupsSegment[] = []
  const country = cups.slice(0, 2)
  segments.push({ kind: "country", text: country })

  const digits = cups.slice(2, 18)
  for (let i = 0; i < digits.length; i += 4) {
    segments.push({ kind: "digits", text: digits.slice(i, i + 4) })
  }

  const control = cups.slice(18, 20)
  if (control) {
    const complete = digits.length === 16 && /^\d{16}$/.test(digits) && control.length === 2
    segments.push({
      kind: "control",
      text: control,
      ...(complete ? { valid: computeCupsControl(digits) === control } : {}),
    })
  }

  const frontier = cups.slice(20, 22)
  if (frontier) segments.push({ kind: "frontier", text: frontier })

  return segments
}
