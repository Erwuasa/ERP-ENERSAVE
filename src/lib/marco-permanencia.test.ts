import { describe, expect, it } from "vitest"
import { formatMarcoPermanenciaLabel, resolveMarcoVigenciaMeses } from "./marco-permanencia"

describe("marco-permanencia", () => {
  it("resuelve 6 meses para Endesa desde reglas por compañía", () => {
    expect(
      resolveMarcoVigenciaMeses({
        compania: "Endesa",
        vigencia_meses: 0,
        condiciones: "Periodo de retrocomisión de referencia: 6 meses",
      })
    ).toBe(6)
  })

  it("muestra retro progresiva para Gana Energia", () => {
    expect(
      formatMarcoPermanenciaLabel({
        compania: "Gana Energia",
        vigencia_meses: 12,
      })
    ).toBe("12 meses (100/75/50/25%)")
  })

  it("muestra retro Naturgy pyme progresiva", () => {
    expect(
      formatMarcoPermanenciaLabel({
        compania: "Naturgy",
        segmento: "pyme",
        vigencia_meses: 12,
        condiciones: "Retro: 12 meses — hasta 6 meses 100%",
      })
    ).toBe("12 meses (100/50/25%)")
  })
})
