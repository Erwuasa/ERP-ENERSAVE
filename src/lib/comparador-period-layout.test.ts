import { describe, expect, it } from "vitest"
import { resolveComparadorPeriodGridLayout } from "./comparador-period-layout"

describe("resolveComparadorPeriodGridLayout", () => {
  it("en 2.0 el precio usa el mismo input y no sale de la columna", () => {
    const potencia = resolveComparadorPeriodGridLayout("2.0TD", "potencia")
    const consumo = resolveComparadorPeriodGridLayout("2.0TD", "consumo")

    expect(potencia.density).toBe("compact")
    expect(potencia.gridClass).toBe("grid-cols-2")
    expect(consumo.gridClass).toBe("grid-cols-3")
    expect(potencia.priceInputClass).toBe(potencia.inputClass)
    expect(consumo.priceInputClass).toBe(consumo.inputClass)
    expect(potencia.fieldClass).toContain("min-w-0")
    expect(potencia.priceLabelClass).toContain("truncate")
    expect(potencia.priceLabelClass).toContain("text-[11px]")
  })

  it("en 3.0 el precio usa la rejilla de tres columnas y el input de las cantidades", () => {
    const potencia = resolveComparadorPeriodGridLayout("3.0TD", "potencia")
    const consumo = resolveComparadorPeriodGridLayout("6.1TD", "consumo")

    expect(potencia.density).toBe("expanded")
    expect(potencia.gridClass).toBe("grid-cols-3")
    expect(consumo.gridClass).toBe("grid-cols-3")
    expect(potencia.priceInputClass).toBe(potencia.inputClass)
    expect(consumo.priceInputClass).toBe(consumo.inputClass)
    expect(potencia.priceInputClass).toContain("text-sm")
    expect(potencia.priceLabelClass).toContain("text-[9px]")
    expect(potencia.priceLabelClass).not.toContain("text-[7px]")
    expect(potencia.fieldClass).toContain("min-w-0")
  })
})
