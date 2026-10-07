import { describe, expect, it } from "vitest"
import {
  asBool,
  asInt,
  asString,
  collectFieldNames,
  extractRows,
  maxNaiveTimestamp,
  shiftNaiveTimestamp,
  stableStringify,
} from "../../../supabase/functions/_shared/enertech-extract"

describe("scalar readers", () => {
  it("reads ints from numbers and numeric strings only", () => {
    expect(asInt(14)).toBe(14)
    expect(asInt("14")).toBe(14)
    expect(asInt("14.5")).toBeNull()
    expect(asInt(null)).toBeNull()
  })

  it("trims strings and treats blanks as null", () => {
    expect(asString("  Endesa ")).toBe("Endesa")
    expect(asString("   ")).toBeNull()
    expect(asString(7)).toBe("7")
  })

  it("reads PHP-style booleans", () => {
    expect(asBool(1)).toBe(true)
    expect(asBool("0")).toBe(false)
    expect(asBool("maybe")).toBeNull()
  })
})

describe("extractRows", () => {
  it("accepts a bare array, a preferred key or the first array property", () => {
    expect(extractRows([{ a: 1 }, 5])).toEqual([{ a: 1 }])
    expect(extractRows({ filas: [{ a: 1 }], items: [{ b: 2 }] }, ["items"])).toEqual([{ b: 2 }])
    expect(extractRows({ success: true, comercializadoras: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(extractRows({ success: true })).toEqual([])
    expect(extractRows(null)).toEqual([])
  })
})

describe("stableStringify", () => {
  it("does not depend on key order", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }))
  })
})

describe("naive timestamps", () => {
  it("shifts without timezone involvement", () => {
    expect(shiftNaiveTimestamp("2026-10-06 00:01:00", -120)).toBe("2026-10-05 23:59:00")
    expect(shiftNaiveTimestamp("2026-10-06", -60)).toBe("2026-10-05 23:59:00")
    expect(shiftNaiveTimestamp("not a date", -60)).toBeNull()
  })

  it("picks the greatest valid timestamp", () => {
    expect(maxNaiveTimestamp(["2026-10-01 10:00:00", null, "2026-10-02 08:00:00", "junk"])).toBe("2026-10-02 08:00:00")
    expect(maxNaiveTimestamp([null])).toBeNull()
  })
})

describe("collectFieldNames", () => {
  it("lists the union of keys, sorted", () => {
    expect(collectFieldNames([{ b: 1 }, { a: 2, b: 3 }])).toEqual(["a", "b"])
  })
})
