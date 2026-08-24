import { describe, expect, it } from "vitest"
import { stripWhitespaceOnPaste } from "./paste-format"
import { normalizeCups } from "./contract-cups-liquidacion"

describe("stripWhitespaceOnPaste", () => {
  it("removes all whitespace including internal spaces", () => {
    expect(stripWhitespaceOnPaste("ES 0021 0000 0000")).toBe("ES002100000000")
    expect(stripWhitespaceOnPaste(" 612 345 678 \n")).toBe("612345678")
  })
})

describe("normalizeCups", () => {
  it("strips whitespace and uppercases for paste and lookup alignment", () => {
    expect(normalizeCups(" es0021000000xx ")).toBe("ES0021000000XX")
    expect(normalizeCups("ES 0021 0000 0000 XX")).toBe("ES002100000000XX")
  })
})
