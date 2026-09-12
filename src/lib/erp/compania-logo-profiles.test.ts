import { describe, expect, it } from "vitest"
import {
  COMPANIA_LOGO_PROFILES,
  cropToClipPath,
  resolveCompaniaLogoProfile,
} from "./compania-logo-profiles"

describe("compania-logo-profiles", () => {
  it("defines a profile for every bundled logo key", () => {
    expect(Object.keys(COMPANIA_LOGO_PROFILES).length).toBeGreaterThanOrEqual(13)
  })

  it("keeps naturgy uncropped and slightly under scale to avoid edge clipping", () => {
    const profile = resolveCompaniaLogoProfile("naturgy", "xl")
    expect(profile.crop).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(profile.boost).toBeLessThanOrEqual(1)
  })

  it("crops vertical padding for gana energia wordmark strip", () => {
    const profile = resolveCompaniaLogoProfile("ganaenergia", "xl")
    expect(profile.crop.top).toBeGreaterThan(0.35)
    expect(profile.crop.bottom).toBeGreaterThan(0.35)
    expect(profile.boost).toBeGreaterThan(1.45)
    expect(profile.fillWidth).toBeGreaterThanOrEqual(1.1)
  })

  it("maximizes niba within the logo box", () => {
    const profile = resolveCompaniaLogoProfile("niba", "xl")
    expect(profile.boost).toBeGreaterThan(1.9)
    expect(profile.fillHeight).toBeGreaterThanOrEqual(1.22)
  })

  it("maximizes endesa horizontal wordmark", () => {
    const profile = resolveCompaniaLogoProfile("endesa", "xl")
    expect(profile.boost).toBeGreaterThan(1.5)
    expect(profile.fillWidth).toBeGreaterThanOrEqual(1.15)
  })

  it("maximizes iberdrola within the logo box", () => {
    const profile = resolveCompaniaLogoProfile("iberdrola", "xl")
    expect(profile.boost).toBeGreaterThan(1.3)
    expect(profile.fillWidth).toBeGreaterThanOrEqual(1.12)
  })

  it("builds valid clip-path inset", () => {
    expect(cropToClipPath({ top: 0.1, right: 0.05, bottom: 0.1, left: 0.05 })).toBe(
      "inset(10.00% 5.00% 10.00% 5.00%)"
    )
  })
})
