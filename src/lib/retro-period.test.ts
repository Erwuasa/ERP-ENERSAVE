import { describe, expect, it } from "vitest"
import {
  calcularPorcentajeRetrocomision,
  getPeajeTramo,
} from "./retro-period"
import type { RetrocomisionSchedule } from "./supabase/retrocomision-schedules"

function schedule(
  overrides: Partial<RetrocomisionSchedule> &
    Pick<RetrocomisionSchedule, "compania" | "segmento" | "tipoCalculo">
): RetrocomisionSchedule {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    peajeTramo: overrides.peajeTramo ?? null,
    mesesFlat: overrides.mesesFlat ?? null,
    tramos: overrides.tramos ?? [],
    notas: overrides.notas ?? null,
    activo: overrides.activo ?? true,
    ...overrides,
  }
}

const FIXTURE_SCHEDULES: RetrocomisionSchedule[] = [
  schedule({
    compania: "Naturgy",
    segmento: "residencial",
    tipoCalculo: "meses_flat",
    mesesFlat: 4,
  }),
  schedule({
    compania: "Naturgy",
    segmento: "pyme",
    tipoCalculo: "tramos_porcentaje",
    tramos: [
      { desde_mes: 0, hasta_mes: 6, valor: 100, unidad: "porcentaje" },
      { desde_mes: 6, hasta_mes: 9, valor: 50, unidad: "porcentaje" },
      { desde_mes: 9, hasta_mes: 12, valor: 25, unidad: "porcentaje" },
    ],
  }),
  schedule({
    compania: "Repsol",
    segmento: "pyme",
    tipoCalculo: "tramos_porcentaje",
    tramos: [
      { desde_mes: 0, hasta_mes: 1, valor: 100, unidad: "porcentaje" },
      { desde_mes: 1, hasta_mes: 2, valor: 91, unidad: "porcentaje" },
      { desde_mes: 2, hasta_mes: 3, valor: 82, unidad: "porcentaje" },
      { desde_mes: 3, hasta_mes: 4, valor: 73, unidad: "porcentaje" },
      { desde_mes: 4, hasta_mes: 5, valor: 64, unidad: "porcentaje" },
      { desde_mes: 5, hasta_mes: 6, valor: 55, unidad: "porcentaje" },
      { desde_mes: 6, hasta_mes: 7, valor: 45, unidad: "porcentaje" },
      { desde_mes: 7, hasta_mes: 8, valor: 36, unidad: "porcentaje" },
      { desde_mes: 8, hasta_mes: 9, valor: 27, unidad: "porcentaje" },
      { desde_mes: 9, hasta_mes: 10, valor: 18, unidad: "porcentaje" },
      { desde_mes: 10, hasta_mes: 11, valor: 9, unidad: "porcentaje" },
      { desde_mes: 11, hasta_mes: 12, valor: 0, unidad: "porcentaje" },
    ],
  }),
  schedule({
    compania: "Repsol",
    segmento: "residencial",
    tipoCalculo: "tramos_porcentaje",
    tramos: [{ desde_mes: 0, hasta_mes: 9999, valor: 100, unidad: "porcentaje" }],
  }),
  schedule({
    compania: "Iberdrola",
    segmento: "ambos",
    peajeTramo: "2.0TD",
    tipoCalculo: "tramos_fijo_eur",
    tramos: [
      { desde_mes: 0, hasta_mes: 3, valor: 100, unidad: "porcentaje" },
      { desde_mes: 3, hasta_mes: 6, valor: 25, unidad: "eur_fijo" },
      { desde_mes: 6, hasta_mes: 9, valor: 15, unidad: "eur_fijo" },
      { desde_mes: 9, hasta_mes: 12, valor: 10, unidad: "eur_fijo" },
    ],
  }),
  schedule({
    compania: "Iberdrola",
    segmento: "ambos",
    peajeTramo: "3.0TD_6.1TD",
    tipoCalculo: "tramos_porcentaje",
    tramos: [
      { desde_mes: 0, hasta_mes: 3, valor: 100, unidad: "porcentaje" },
      { desde_mes: 3, hasta_mes: 6, valor: 75, unidad: "porcentaje" },
      { desde_mes: 6, hasta_mes: 9, valor: 25, unidad: "porcentaje" },
      { desde_mes: 9, hasta_mes: 12, valor: 15, unidad: "porcentaje" },
    ],
  }),
]

describe("getPeajeTramo", () => {
  it("mapea 2.0TD sin cambios", () => {
    expect(getPeajeTramo("2.0TD")).toBe("2.0TD")
  })

  it("agrupa peajes 3.0TD y 6.xTD en 3.0TD_6.1TD", () => {
    expect(getPeajeTramo("3.0TD")).toBe("3.0TD_6.1TD")
    expect(getPeajeTramo("6.1TD")).toBe("3.0TD_6.1TD")
    expect(getPeajeTramo("6.2TD")).toBe("3.0TD_6.1TD")
  })
})

describe("calcularPorcentajeRetrocomision", () => {
  it("Naturgy residencial: 100% antes de 4 meses, 0% desde el mes 4", () => {
    const before = calcularPorcentajeRetrocomision(
      "Naturgy",
      "residencial",
      "2.0TD",
      3,
      FIXTURE_SCHEDULES
    )
    expect(before.porcentaje).toBe(100)
    expect(before.scheduleUsado?.segmento).toBe("residencial")

    const after = calcularPorcentajeRetrocomision(
      "Naturgy",
      "residencial",
      "2.0TD",
      4,
      FIXTURE_SCHEDULES
    )
    expect(after.porcentaje).toBe(0)
  })

  it("Naturgy pyme: 100% mes 0-6, 50% mes 6-9, 25% mes 9-12, 0% después", () => {
    expect(
      calcularPorcentajeRetrocomision("Naturgy", "pyme", "2.0TD", 5, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(100)
    expect(
      calcularPorcentajeRetrocomision("Naturgy", "pyme", "2.0TD", 6, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(50)
    expect(
      calcularPorcentajeRetrocomision("Naturgy", "pyme", "2.0TD", 9, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(25)
    expect(
      calcularPorcentajeRetrocomision("Naturgy", "pyme", "2.0TD", 12, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(0)
  })

  it("Repsol pyme: verifica puntos clave de la curva decreciente", () => {
    expect(
      calcularPorcentajeRetrocomision("Repsol", "pyme", "2.0TD", 0, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(100)
    expect(
      calcularPorcentajeRetrocomision("Repsol", "pyme", "2.0TD", 5, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(55)
    expect(
      calcularPorcentajeRetrocomision("Repsol", "pyme", "2.0TD", 11, FIXTURE_SCHEDULES)
        .porcentaje
    ).toBe(0)
  })

  it("Iberdrola: fórmulas distintas según peaje para el mismo mes transcurrido", () => {
    const peaje20 = calcularPorcentajeRetrocomision(
      "Iberdrola",
      "residencial",
      "2.0TD",
      4,
      FIXTURE_SCHEDULES
    )
    const peaje30 = calcularPorcentajeRetrocomision(
      "Iberdrola",
      "residencial",
      "3.0TD",
      4,
      FIXTURE_SCHEDULES
    )

    expect(peaje20.valorFijoEur).toBe(25)
    expect(peaje20.porcentaje).toBe(0)
    expect(peaje30.porcentaje).toBe(75)
    expect(peaje30.valorFijoEur).toBeUndefined()
    expect(peaje20.scheduleUsado?.peajeTramo).toBe("2.0TD")
    expect(peaje30.scheduleUsado?.peajeTramo).toBe("3.0TD_6.1TD")
  })

  it("compañía sin schedule: devuelve 100% estimado, nunca 0% por defecto", () => {
    const result = calcularPorcentajeRetrocomision(
      "Compañía Inexistente",
      "residencial",
      "2.0TD",
      8,
      FIXTURE_SCHEDULES
    )

    expect(result.porcentaje).toBe(100)
    expect(result.estimado).toBe(true)
    expect(result.scheduleUsado).toBeNull()
  })
})
