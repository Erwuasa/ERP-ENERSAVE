import { getFaseConfig } from "./pipeline"
import { getStagePipelineSpec } from "./stage-gate"
import { QUICK_WIN_RULES } from "./quick-wins"
import type { Prospecto, ProspectoFase } from "./types"

/** Límite de tiempo en fase según reglas del pipeline (SLA del sistema). */
export function getFaseSlaPolicyLabel(fase: ProspectoFase, prospecto?: Prospecto): string {
  const spec = getStagePipelineSpec(fase)
  if (spec) return spec.slaLabel
  const config = getFaseConfig(fase)
  if (config.slaHorasMax != null) return `${config.slaHorasMax} h en fase`
  if (config.slaUsesFechaProximoContacto) return "Según próximo contacto"
  if (config.slaDiasMax != null) return `${config.slaDiasMax} d en fase`
  return "Sin límite"
}

/** Tarea que el sistema asigna al entrar en esta fase (primera quick-win). */
export function getFaseExpectedTaskLabel(fase: ProspectoFase): string {
  const rules = QUICK_WIN_RULES[fase]
  if (!rules?.length) return "—"
  return rules[0].titulo
}

export function getFaseAvanceRequisito(fase: ProspectoFase): string | undefined {
  return getStagePipelineSpec(fase)?.avanceRequisito
}
