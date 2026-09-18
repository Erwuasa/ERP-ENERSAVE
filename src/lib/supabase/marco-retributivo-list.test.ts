import { describe, expect, it } from "vitest"
import { MARCO_LIST_PAGE_SIZE } from "./marco-retributivo"

describe("listMarcoRetributivo pagination", () => {
  it("uses page size below PostgREST default limit", () => {
    expect(MARCO_LIST_PAGE_SIZE).toBeLessThanOrEqual(1000)
    expect(MARCO_LIST_PAGE_SIZE).toBeGreaterThan(0)
  })
})
