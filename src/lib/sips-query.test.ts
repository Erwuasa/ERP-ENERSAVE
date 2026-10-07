import { describe, expect, it } from "vitest"
import {
  isPlausibleSipsCups,
  isSixPeriodSipsTariff,
  normalizeSipsCupsInput,
  sipsPeriodKeysForTariff,
} from "@/lib/sips-query"

describe("sips-query", () => {
  it("normalizes cups input", () => {
    expect(normalizeSipsCupsInput(" es0033770541171001wg0f ")).toBe("ES0033770541171001WG0F")
  })

  it("validates plausible cups format", () => {
    expect(isPlausibleSipsCups("ES0033770541171001WG0F")).toBe(true)
    expect(isPlausibleSipsCups("ES0000000000000000XX")).toBe(true)
    expect(isPlausibleSipsCups("INVALID")).toBe(false)
  })

  it("detects six-period tariffs from 3.0 onward", () => {
    expect(isSixPeriodSipsTariff("2.0TD")).toBe(false)
    expect(isSixPeriodSipsTariff("3.0TD")).toBe(true)
    expect(isSixPeriodSipsTariff("6.1TD")).toBe(true)
    expect(sipsPeriodKeysForTariff("2.0TD")).toEqual(["P1", "P2", "P3"])
    expect(sipsPeriodKeysForTariff("3.0TD")).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"])
  })
})
