import { describe, expect, it } from "vitest"
import { applyPotenciaP1Replication } from "./usePotenciaP1Autofill"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"

const basePotencias: ComparadorPeriodValues = {
  p1: 4.6,
  p2: 4.6,
  p3: 0,
  p4: 0,
  p5: 0,
  p6: 0,
}

describe("applyPotenciaP1Replication", () => {
  it("replicates P1 into untouched periods", () => {
    const next = applyPotenciaP1Replication(basePotencias, 5.5, new Set())
    expect(next.p1).toBe(5.5)
    expect(next.p2).toBe(5.5)
    expect(next.p3).toBe(5.5)
    expect(next.p6).toBe(5.5)
  })

  it("does not overwrite manually touched periods", () => {
    const touched = new Set<"p3">(["p3"])
    const withManualP3 = { ...basePotencias, p3: 7.2 }

    const next = applyPotenciaP1Replication(withManualP3, 6, touched)
    expect(next.p1).toBe(6)
    expect(next.p2).toBe(6)
    expect(next.p3).toBe(7.2)
    expect(next.p4).toBe(6)
    expect(next.p5).toBe(6)
    expect(next.p6).toBe(6)
  })
})
