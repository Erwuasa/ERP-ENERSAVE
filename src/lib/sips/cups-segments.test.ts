import { describe, expect, it } from "vitest"
import { splitCupsSegments } from "./cups-segments"

describe("splitCupsSegments", () => {
  it("returns nothing for empty input", () => {
    expect(splitCupsSegments("  ")).toEqual([])
  })

  it("splits a full CUPS and validates the control letters", () => {
    expect(splitCupsSegments("ES0031408000000000AF0F")).toEqual([
      { kind: "country", text: "ES" },
      { kind: "digits", text: "0031" },
      { kind: "digits", text: "4080" },
      { kind: "digits", text: "0000" },
      { kind: "digits", text: "0000" },
      { kind: "control", text: "AF", valid: true },
      { kind: "frontier", text: "0F" },
    ])
  })

  it("flags wrong control letters", () => {
    const control = splitCupsSegments("ES0031408000000000AA").find((s) => s.kind === "control")
    expect(control).toEqual({ kind: "control", text: "AA", valid: false })
  })

  it("does not judge partial input", () => {
    const segments = splitCupsSegments("es0031 408")
    expect(segments.map((s) => s.text)).toEqual(["ES", "0031", "408"])
    expect(segments.some((s) => s.kind === "control")).toBe(false)
  })
})
