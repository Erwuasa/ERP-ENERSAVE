import { describe, expect, it } from "vitest"
import {
  ARCHIVO_FASES,
  canTransition,
  FUNNEL_ORDER,
} from "../../lib/ventas/pipeline"
import type { ProspectoFase, UpdateProspectoPatch } from "../../lib/ventas/types"

const ALL_FASES: ProspectoFase[] = [...FUNNEL_ORDER, ...ARCHIVO_FASES]

describe("ficha section logic", () => {
  it("target fase list excludes current fase and invalid transitions", () => {
    const current: ProspectoFase = "contactado"
    const targets = ALL_FASES.filter((f) => f !== current && canTransition(current, f))
    expect(targets).not.toContain("contactado")
    expect(targets).toContain("cualificado")
    expect(targets).toContain("descartado")
    expect(targets).not.toContain("tramitacion")
  })

  it("propuesta patch contains three propuesta keys", () => {
    const patch: UpdateProspectoPatch = {
      propuestaCompania: "Endesa",
      propuestaTarifa: "2.0TD",
      propuestaNotas: "Oferta enviada",
    }
    expect(patch.propuestaCompania).toBe("Endesa")
    expect(patch.propuestaTarifa).toBe("2.0TD")
    expect(patch.propuestaNotas).toBe("Oferta enviada")
  })

  it("archivo fases reachable from contactado via canTransition", () => {
    expect(canTransition("contactado", "con_dudas")).toBe(true)
    expect(ARCHIVO_FASES.includes("recontactar")).toBe(true)
  })
})
