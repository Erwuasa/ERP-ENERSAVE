import { describe, expect, it } from "vitest"
import { allowsComparadorProviderForSegment } from "./comparador-provider-segment"

describe("allowsComparadorProviderForSegment", () => {
  it("blocks IGNIS in residencial segment", () => {
    expect(allowsComparadorProviderForSegment("IGNIS", "residencial")).toBe(false)
    expect(allowsComparadorProviderForSegment("Ignis Energía", "residencial")).toBe(false)
  })

  it("allows IGNIS in pyme segment", () => {
    expect(allowsComparadorProviderForSegment("IGNIS", "pyme")).toBe(true)
  })

  it("allows other providers in residencial", () => {
    expect(allowsComparadorProviderForSegment("Endesa", "residencial")).toBe(true)
  })
})
