import type { CSSProperties } from "react"
import type { CalendarioEventoTipo } from "../../types/calendario"
import { colorForCalendarioUsuario } from "../../lib/calendario-colors"

const TIPO_COLORS: Record<CalendarioEventoTipo, string> = {
  evento: "#06b6d4",
  reunion: "#a855f7",
  vacaciones: "#f59e0b",
  ausencia: "#64748b",
}

export function resolveCalendarioEventAccent(
  tipo: CalendarioEventoTipo,
  usuarioId: string,
  useUserColor: boolean
): string {
  if (useUserColor) return colorForCalendarioUsuario(usuarioId)
  return TIPO_COLORS[tipo] ?? TIPO_COLORS.evento
}

export function calendarioEventSurfaceStyle(accent: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${accent} 22%, var(--brand-panel))`,
    borderColor: `color-mix(in srgb, ${accent} 55%, var(--brand-border))`,
    borderLeftColor: accent,
    borderLeftWidth: 4,
    color: "var(--brand-text)",
    boxShadow: "0 1px 2px color-mix(in srgb, #000 25%, transparent)",
  }
}
