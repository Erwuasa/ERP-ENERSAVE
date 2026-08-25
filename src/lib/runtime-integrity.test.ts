import { describe, expect, it } from "vitest"
import { buildSecurityIncidencia } from "./runtime-integrity-incident"
import {
  dedupeFindings,
  detectAutomationGlobals,
  detectPrototypePollution,
  mergeIntegrityResults,
  runIntegrityScan,
} from "./runtime-integrity"

describe("runtime-integrity", () => {
  it("dedupes findings by fingerprint", () => {
    const findings = dedupeFindings([
      {
        code: "foreign_script_injected",
        level: "high",
        message: "Script externo",
        detail: "https://evil.test/a.js",
        fingerprint: "foreign_script_injected:https://evil.test/a.js",
      },
      {
        code: "foreign_script_injected",
        level: "high",
        message: "Script externo",
        detail: "https://evil.test/a.js",
        fingerprint: "foreign_script_injected:https://evil.test/a.js",
      },
    ])
    expect(findings).toHaveLength(1)
  })

  it("does not flag native Object.prototype keys as pollution", () => {
    expect(detectPrototypePollution()).toEqual([])
  })

  it("does not block in non-production even with critical findings", () => {
    const merged = mergeIntegrityResults(
      { findings: [], blocked: false },
      {
        findings: [
          {
            code: "extension_resource",
            level: "critical",
            message: "Script de extensión",
            fingerprint: "extension_resource:chrome-extension://abc",
          },
        ],
        blocked: true,
      }
    )
    expect(merged.blocked).toBe(false)
    expect(merged.findings).toHaveLength(1)
  })

  it("builds security incidencia for superadmin review", () => {
    const ticket = buildSecurityIncidencia({
      userId: "usr-3",
      userName: "Ignacio Ortiz",
      findings: [
        {
          code: "native_api_tampered",
          level: "critical",
          message: "API nativa alterada",
          detail: "fetch",
          fingerprint: "native_api_tampered:fetch",
        },
      ],
      existingIncidencias: [],
    })

    expect(ticket.tipo).toBe("Riesgo de Seguridad")
    expect(ticket.prioridad).toBe("critica")
    expect(ticket.origen).toBe("sistema")
    expect(ticket.comercialName).toBe("Ignacio Ortiz")
    expect(ticket.descripcion).toContain("API nativa alterada")
  })
})

describe("runtime-integrity browser checks", () => {
  it("runs scan without throwing when DOM is available", () => {
    if (typeof window === "undefined" || typeof document === "undefined") return
    expect(() => runIntegrityScan()).not.toThrow()
  })

  it("does not flag webdriver when absent", () => {
    if (typeof navigator === "undefined") return
    expect(detectAutomationGlobals()).toEqual([])
  })
})
