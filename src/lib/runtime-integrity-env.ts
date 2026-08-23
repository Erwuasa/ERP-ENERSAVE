import type { IntegrityFinding, IntegrityFindingCode } from "./runtime-integrity"

/** Solo activo en build de producción (`vite build`). Desactivado en dev/sandbox. */
export function isRuntimeIntegrityEnforced(): boolean {
  if (import.meta.env.DEV) return false
  return import.meta.env.PROD
}

const BLOCKING_CODES = new Set<IntegrityFindingCode>([
  "native_api_tampered",
  "extension_resource",
  "foreign_script_injected",
  "automation_global",
  "prototype_pollution",
  "csp_violation",
  "suspicious_iframe",
])

export function isBlockingIntegrityFinding(
  finding: IntegrityFinding,
  enforced = isRuntimeIntegrityEnforced()
): boolean {
  if (!enforced) return false
  if (!BLOCKING_CODES.has(finding.code)) return false
  if (finding.level === "critical") return true
  if (finding.level === "high") {
    return (
      finding.code === "foreign_script_injected" || finding.code === "suspicious_iframe"
    )
  }
  return false
}

/** Bloquea solo riesgos reales de inyección o extracción JS, no extensiones cosméticas (Grammarly, etc.). */
export function shouldBlockFinding(finding: IntegrityFinding): boolean {
  return isBlockingIntegrityFinding(finding)
}

export function hasBlockingFindings(findings: IntegrityFinding[]): boolean {
  return findings.some(shouldBlockFinding)
}

export function filterBlockingFindings(findings: IntegrityFinding[]): IntegrityFinding[] {
  return findings.filter(shouldBlockFinding)
}
