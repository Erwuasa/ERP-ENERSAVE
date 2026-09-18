import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import {
  migrateMarcoCondicionesFields,
  resolveMarcoCondicion2Label,
} from "@/lib/marco-tramo-condicion"

function isDeprecatedCondicionesText(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return (
    normalized.startsWith("[desactivado") ||
    normalized.includes("desactivado 2026") ||
    normalized.startsWith("fuente:") ||
    normalized.startsWith("fte:")
  )
}

export function formatMarcoCondicionesCelda(row: MarcoRetributivoRow): string {
  const migrated = migrateMarcoCondicionesFields(row.condicion_1, row.condicion_2)
  const tramoLabel = resolveMarcoCondicion2Label({
    ...row,
    condicion_1: migrated.condicion_1 || null,
    condicion_2: migrated.condicion_2 || null,
  })
  if (tramoLabel) return tramoLabel

  const condicion2 = migrated.condicion_2.trim()
  if (condicion2 && !isDeprecatedCondicionesText(condicion2)) return condicion2

  const condiciones = row.condiciones?.trim()
  if (condiciones && !isDeprecatedCondicionesText(condiciones)) {
    const consumoMatch = condiciones.match(/Consumo\/Potencia:\s*([^|]+)/i)
    if (consumoMatch?.[1]?.trim()) return consumoMatch[1].trim()
  }

  return "—"
}
