import { describe, expect, it } from "vitest"
import { MARCO_LIST_PAGE_SIZE, marcoListShouldFetchNextPage, withContractCompania } from "./marco-retributivo"

describe("listMarcoRetributivo pagination", () => {
  it("uses page size below PostgREST default limit", () => {
    expect(MARCO_LIST_PAGE_SIZE).toBeLessThanOrEqual(1000)
    expect(MARCO_LIST_PAGE_SIZE).toBeGreaterThan(0)
  })

  it("rellena la compañía vacía de la comisión con la del contrato", () => {
    const rows = withContractCompania(
      [
        { tarifa: "Tarifa Noche Luz", compania: "" },
        { tarifa: "Otra", compania: "Iberdrola" },
      ],
      [{ tarifa: "tarifa noche luz", compania: "Naturgy" }]
    )
    expect(rows[0]?.compania).toBe("Naturgy")
    expect(rows[1]?.compania).toBe("Iberdrola")
  })

  it("sigue paginando cuando la página trae filas completas aunque el batch filtrado sea menor", () => {
    expect(marcoListShouldFetchNextPage(500)).toBe(true)
    expect(marcoListShouldFetchNextPage(450)).toBe(false)
    expect(marcoListShouldFetchNextPage(0)).toBe(false)
  })
})
