import { describe, expect, it } from "vitest"
import { computeCupsControl, normalizeCups, validateCups } from "./cups"

describe("normalizeCups", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeCups(" es0031 4080-0000.0000 af ")).toBe("ES0031408000000000AF")
  })
})

describe("computeCupsControl", () => {
  it("matches independently computed control letters", () => {
    expect(computeCupsControl("0031408000000000")).toBe("AF")
    expect(computeCupsControl("0021000012345678")).toBe("LB")
    expect(computeCupsControl("0000000000000000")).toBe("TT")
  })
})

describe("validateCups", () => {
  it("accepts a valid CUPS, with or without the trailing frontier code", () => {
    expect(validateCups("ES0031408000000000AF")).toEqual({ ok: true, cups: "ES0031408000000000AF" })
    expect(validateCups("es0021 0000 1234 5678 lb 0f")).toEqual({ ok: true, cups: "ES0021000012345678LB0F" })
  })

  it("rejects empty input", () => {
    expect(validateCups("   ")).toEqual({ ok: false, reason: "empty" })
  })

  it("rejects malformed values", () => {
    expect(validateCups("ES123")).toEqual({ ok: false, reason: "format" })
    expect(validateCups("FR0031408000000000AF")).toEqual({ ok: false, reason: "format" })
    expect(validateCups("ES0031408000000000A1")).toEqual({ ok: false, reason: "format" })
  })

  it("rejects a wrong control letter pair", () => {
    expect(validateCups("ES0031408000000000AA")).toEqual({ ok: false, reason: "control" })
  })
})
