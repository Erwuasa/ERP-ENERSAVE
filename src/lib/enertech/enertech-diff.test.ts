import { describe, expect, it } from "vitest"
import {
  classifyRows,
  hasRowChanged,
  shouldApplyRemovals,
  type ExistingRow,
  type IncomingRow,
} from "../../../supabase/functions/_shared/enertech-diff"

const incoming = (key: string, actualizadoEn: string | null, hash = `h-${key}`): IncomingRow => ({
  key,
  actualizadoEn,
  hash,
})
const existing = (
  key: string,
  actualizadoEn: string | null,
  hash = `h-${key}`,
  removedAt: string | null = null
): ExistingRow => ({ key, actualizadoEn, hash, removedAt })

describe("hasRowChanged", () => {
  it("detects a moved actualizado_en", () => {
    expect(hasRowChanged(incoming("a", "2026-10-02"), existing("a", "2026-10-01"))).toBe(true)
  })

  it("detects a payload change even when actualizado_en did not move", () => {
    expect(hasRowChanged(incoming("a", "2026-10-01", "new"), existing("a", "2026-10-01", "old"))).toBe(true)
  })

  it("is false when both match", () => {
    expect(hasRowChanged(incoming("a", "2026-10-01"), existing("a", "2026-10-01"))).toBe(false)
  })

  it("uses the hash alone for entities without actualizado_en", () => {
    expect(hasRowChanged(incoming("a", null), existing("a", null))).toBe(false)
    expect(hasRowChanged(incoming("a", null, "x"), existing("a", null, "y"))).toBe(true)
  })
})

describe("classifyRows", () => {
  it("splits created, updated, restored, unchanged and removed", () => {
    const result = classifyRows(
      [incoming("new", "1"), incoming("upd", "2"), incoming("back", "1"), incoming("same", "1")],
      [existing("upd", "1"), existing("back", "1", "h-back", "2026-09-01"), existing("same", "1"), existing("gone", "1")],
      { removeMissing: true }
    )
    expect(result.created.map((r) => r.key)).toEqual(["new"])
    expect(result.updated.map((r) => r.key)).toEqual(["upd"])
    expect(result.restored.map((r) => r.key)).toEqual(["back"])
    expect(result.unchanged.map((r) => r.key)).toEqual(["same"])
    expect(result.removedKeys).toEqual(["gone"])
  })

  it("never removes when removeMissing is off (incremental feeds)", () => {
    const result = classifyRows([incoming("a", "1")], [existing("a", "1"), existing("b", "1")], {
      removeMissing: false,
    })
    expect(result.removedKeys).toEqual([])
  })

  it("ignores duplicate keys in the incoming feed", () => {
    const result = classifyRows([incoming("a", "1"), incoming("a", "1")], [], { removeMissing: true })
    expect(result.created).toHaveLength(1)
  })

  it("does not remove rows that were already removed", () => {
    const result = classifyRows([], [existing("x", "1", "h", "2026-09-01")], { removeMissing: true })
    expect(result.removedKeys).toEqual([])
  })
})

describe("shouldApplyRemovals", () => {
  it("blocks removals after an empty answer", () => {
    expect(shouldApplyRemovals(0, 30)).toBe(false)
  })

  it("blocks removals when far fewer rows come back than we hold", () => {
    expect(shouldApplyRemovals(4, 40)).toBe(false)
    expect(shouldApplyRemovals(30, 40)).toBe(true)
  })

  it("allows removals on small tables and first loads", () => {
    expect(shouldApplyRemovals(1, 3)).toBe(true)
    expect(shouldApplyRemovals(0, 0)).toBe(true)
  })
})
