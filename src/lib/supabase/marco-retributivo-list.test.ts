import { describe, expect, it } from "vitest"
import { MARCO_LIST_PAGE_SIZE, marcoListShouldFetchNextPage } from "./marco-retributivo"

describe("listMarcoRetributivo pagination", () => {
  it("uses page size below PostgREST default limit", () => {
    expect(MARCO_LIST_PAGE_SIZE).toBeLessThanOrEqual(1000)
    expect(MARCO_LIST_PAGE_SIZE).toBeGreaterThan(0)
  })

  it("sigue paginando cuando la página trae filas completas aunque el batch filtrado sea menor", () => {
    expect(marcoListShouldFetchNextPage(500)).toBe(true)
    expect(marcoListShouldFetchNextPage(450)).toBe(false)
    expect(marcoListShouldFetchNextPage(0)).toBe(false)
  })
})
