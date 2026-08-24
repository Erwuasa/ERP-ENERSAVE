import { describe, expect, it } from "vitest"
import type { IntegrityFinding } from "./runtime-integrity"
import {
  filterBlockingFindings,
  hasBlockingFindings,
  isBlockingIntegrityFinding,
  isRuntimeIntegrityEnforced,
} from "./runtime-integrity-env"

function finding(
  code: IntegrityFinding["code"],
  level: IntegrityFinding["level"]
): IntegrityFinding {
  return {
    code,
    level,
    message: "test",
    fingerprint: `${code}:${level}`,
  }
}

describe("runtime-integrity-env", () => {
  it("is disabled outside production builds", () => {
    expect(isRuntimeIntegrityEnforced()).toBe(false)
  })

  it("blocks critical injection and extraction signals when enforced", () => {
    expect(isBlockingIntegrityFinding(finding("extension_resource", "critical"), true)).toBe(
      true
    )
    expect(isBlockingIntegrityFinding(finding("native_api_tampered", "critical"), true)).toBe(
      true
    )
    expect(isBlockingIntegrityFinding(finding("foreign_script_injected", "high"), true)).toBe(
      true
    )
    expect(isBlockingIntegrityFinding(finding("injection_dom_root", "high"), true)).toBe(false)
  })

  it("never blocks when enforcement is off", () => {
    const findings = [
      finding("injection_dom_root", "high"),
      finding("foreign_script_injected", "high"),
      finding("extension_resource", "critical"),
    ]
    expect(hasBlockingFindings(findings)).toBe(false)
    expect(filterBlockingFindings(findings)).toEqual([])
    expect(isBlockingIntegrityFinding(findings[2]!, false)).toBe(false)
  })
})
