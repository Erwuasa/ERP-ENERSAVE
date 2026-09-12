import type { CompaniaLogoKey } from "./compania-logos"

export type CompaniaLogoSize = "sm" | "md" | "lg" | "xl"

/** Recorte normalizado del padding muerto en cada WebP (medido sobre el asset real). */
export interface CompaniaLogoCrop {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CompaniaLogoDisplayProfile {
  crop: CompaniaLogoCrop
  /** Escala fina tras recortar padding (1 = neutro). */
  boost: number
  objectPosition: string
  /** Multiplica cuánto del contenedor ocupa (1 = default del tamaño). */
  fillScale?: number
  /** Tope de ocupación del contenedor para logos que necesitan más presencia. */
  maxFill?: number
}

/**
 * Perfiles calibrados logo a logo.
 * Criterio: recortar márgenes del archivo, luego rellenar el contenedor fijo sin overflow agresivo.
 */
export const COMPANIA_LOGO_PROFILES: Record<CompaniaLogoKey, CompaniaLogoDisplayProfile> = {
  axpo: {
    crop: { top: 0.146, right: 0.071, bottom: 0.146, left: 0.073 },
    boost: 1,
    objectPosition: "center",
  },
  edp: {
    crop: { top: 0.222, right: 0.117, bottom: 0.225, left: 0.117 },
    boost: 1.02,
    objectPosition: "center",
  },
  endesa: {
    crop: { top: 0.388, right: 0.02, bottom: 0.408, left: 0.028 },
    boost: 1.56,
    fillScale: 1.24,
    objectPosition: "center",
  },
  ganaenergia: {
    crop: { top: 0.375, right: 0.025, bottom: 0.375, left: 0.025 },
    boost: 1.52,
    fillScale: 1.2,
    objectPosition: "center",
  },
  holaluz: {
    crop: { top: 0.325, right: 0.116, bottom: 0.325, left: 0.116 },
    boost: 1,
    objectPosition: "center",
  },
  iberdrola: {
    crop: { top: 0.275, right: 0.162, bottom: 0.275, left: 0.163 },
    boost: 1.36,
    fillScale: 1.18,
    objectPosition: "center",
  },
  ignis: {
    crop: { top: 0.192, right: 0.112, bottom: 0.192, left: 0.112 },
    boost: 1,
    objectPosition: "center",
  },
  naturgy: {
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    boost: 0.94,
    objectPosition: "center",
  },
  niba: {
    crop: { top: 0, right: 0, bottom: 0.475, left: 0 },
    boost: 1.95,
    fillScale: 1.34,
    maxFill: 1.26,
    objectPosition: "center",
  },
  octopus: {
    crop: { top: 0.019, right: 0.027, bottom: 0.019, left: 0.026 },
    boost: 1,
    objectPosition: "center",
  },
  repsol: {
    crop: { top: 0.163, right: 0.229, bottom: 0.165, left: 0.229 },
    boost: 1.04,
    objectPosition: "center",
  },
  totalenergies: {
    crop: { top: 0.134, right: 0.105, bottom: 0.138, left: 0.109 },
    boost: 1,
    objectPosition: "center",
  },
  unielectrica: {
    crop: { top: 0.025, right: 0.015, bottom: 0.033, left: 0.033 },
    boost: 1.02,
    objectPosition: "center",
  },
}

const DEFAULT_PROFILE: CompaniaLogoDisplayProfile = {
  crop: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
  boost: 1,
  objectPosition: "center",
}

/** Cuánto del contenedor puede ocupar el logo ya recortado (evita recortes en los bordes). */
const SIZE_FILL: Record<CompaniaLogoSize, { width: number; height: number }> = {
  sm: { width: 0.94, height: 0.88 },
  md: { width: 0.96, height: 0.9 },
  lg: { width: 0.97, height: 0.92 },
  xl: { width: 0.98, height: 0.94 },
}

const MAX_FILL = 1.2

export function resolveCompaniaLogoProfile(
  key: CompaniaLogoKey | null,
  size: CompaniaLogoSize
): CompaniaLogoDisplayProfile & { fillWidth: number; fillHeight: number } {
  const base = key ? (COMPANIA_LOGO_PROFILES[key] ?? DEFAULT_PROFILE) : DEFAULT_PROFILE
  const fill = SIZE_FILL[size]
  const fillMul = base.fillScale ?? 1
  const maxFill = base.maxFill ?? MAX_FILL
  return {
    ...base,
    fillWidth: Math.min(fill.width * fillMul, maxFill),
    fillHeight: Math.min(fill.height * fillMul, maxFill),
  }
}

export function cropToClipPath(crop: CompaniaLogoCrop): string {
  const top = (crop.top * 100).toFixed(2)
  const right = (crop.right * 100).toFixed(2)
  const bottom = (crop.bottom * 100).toFixed(2)
  const left = (crop.left * 100).toFixed(2)
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`
}
