import { describe, expect, it } from "vitest"
import {
  formatNumberToDecimalComa,
  parseDecimalComaInput,
  sanitizeDecimalComaInput,
} from "./decimal-input"

describe("decimal-input", () => {
  it("parses comma and dot decimals", () => {
    expect(parseDecimalComaInput("5,5")).toBe(5.5)
    expect(parseDecimalComaInput("5.5")).toBe(5.5)
    expect(parseDecimalComaInput("  12,75 ")).toBe(12.75)
  })

  it("rejects invalid characters", () => {
    expect(sanitizeDecimalComaInput("5,5kW")).toBe("5,5")
    expect(parseDecimalComaInput("abc")).toBeNull()
    expect(parseDecimalComaInput("")).toBeNull()
  })

  it("formats numbers with comma for display", () => {
    expect(formatNumberToDecimalComa(5.5)).toBe("5,5")
    expect(formatNumberToDecimalComa(1200)).toBe("1200")
    expect(formatNumberToDecimalComa(4.6)).toBe("4,6")
  })
})
