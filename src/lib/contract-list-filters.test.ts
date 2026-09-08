import { describe, expect, it } from "vitest"
import { isDateInCurrentMonth, matchesContractListFilter } from "./contract-list-filters"

const reference = new Date(2026, 8, 8)

describe("contract list month filters", () => {
  it("matches contracts created in the current month", () => {
    expect(
      matchesContractListFilter(
        { id: "1", estado: "ACTIVADO", createdAt: "2026-09-03" },
        "creados_este_mes",
        reference
      )
    ).toBe(true)

    expect(
      matchesContractListFilter(
        { id: "2", estado: "ACTIVADO", createdAt: "2026-08-30" },
        "creados_este_mes",
        reference
      )
    ).toBe(false)
  })

  it("matches bajas in the current month using fechaBaja", () => {
    expect(
      matchesContractListFilter(
        {
          id: "1",
          estado: "Dado de Baja",
          createdAt: "2026-01-01",
          fechaBaja: "2026-09-05",
        },
        "bajas_este_mes",
        reference
      )
    ).toBe(true)

    expect(
      matchesContractListFilter(
        {
          id: "2",
          estado: "ACTIVADO",
          createdAt: "2026-09-05",
        },
        "bajas_este_mes",
        reference
      )
    ).toBe(false)
  })

  it("detects current month boundaries", () => {
    expect(isDateInCurrentMonth("2026-09-01", reference)).toBe(true)
    expect(isDateInCurrentMonth("2026-09-30", reference)).toBe(true)
    expect(isDateInCurrentMonth("2026-10-01", reference)).toBe(false)
  })
})
