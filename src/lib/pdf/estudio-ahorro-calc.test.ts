import { describe, expect, it } from "vitest"
import { formatEur, formatNum } from "./estudio-ahorro-calc"

const NBSP = " "

describe("estudio-ahorro-calc formatting", () => {
  it("always groups thousands, including 4-digit amounts", () => {
    expect(formatEur(1073.74)).toBe(`1.073,74${NBSP}€`)
    expect(formatEur(13666.65)).toBe(`13.666,65${NBSP}€`)
    expect(formatEur(-1073.74)).toBe(`-1.073,74${NBSP}€`)
  })

  it("keeps amounts below one thousand ungrouped", () => {
    expect(formatEur(999.99)).toBe(`999,99${NBSP}€`)
    expect(formatEur(0)).toBe(`0,00${NBSP}€`)
  })

  it("formats plain numbers with the requested decimals and grouping", () => {
    expect(formatNum(10000, 3)).toBe("10.000,000")
    expect(formatNum(1234.5, 3)).toBe("1.234,500")
    expect(formatNum(18.02, 1)).toBe("18,0")
  })
})
