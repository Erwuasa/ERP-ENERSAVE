import { describe, expect, it } from "vitest"
import { getMotionDuration } from "./motion-prefs"

describe("getMotionDuration", () => {
  it("returns 0 when reduced motion is enabled", () => {
    expect(getMotionDuration(180, true)).toBe(0)
  })

  it("returns original ms when reduced motion is disabled", () => {
    expect(getMotionDuration(180, false)).toBe(180)
  })
})
