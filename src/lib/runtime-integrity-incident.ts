import {
  generateIncidenciaCodigo,
  normalizeIncidenciaTicket,
  type IncidenciaTicket,
} from "./incidencias"
import type { IntegrityFinding } from "./runtime-integrity"

interface BuildSecurityIncidenciaInput {
  userId: string
  userName: string
  findings: IntegrityFinding[]
  existingIncidencias: IncidenciaTicket[]
}

export function buildSecurityIncidenciaDescription(findings: IntegrityFinding[]): string {
  const lines = findings.map(
    (item, index) =>
      `${index + 1}. [${item.level.toUpperCase()}] ${item.message}${item.detail ? ` (${item.detail})` : ""}`
  )
  return [
    "Bloqueo automático por guardián de integridad del runtime.",
    "Motivo:",
    ...lines,
    "",
    `Detectado: ${new Date().toISOString()}`,
  ].join("\n")
}

export function buildSecurityIncidencia({
  userId,
  userName,
  findings,
  existingIncidencias,
}: BuildSecurityIncidenciaInput): IncidenciaTicket {
  const primary = findings[0]
  const summary = primary?.message ?? "Riesgo de inyección o manipulación detectado"

  return normalizeIncidenciaTicket({
    id: `inc-sec-${Date.now()}`,
    codigo: generateIncidenciaCodigo(existingIncidencias),
    clientName: `Seguridad · ${userName}`,
    tipo: "Riesgo de Seguridad",
    prioridad: "critica",
    estado: "abierto",
    origen: "sistema",
    comercialId: userId,
    comercialName: userName,
    descripcion: `${summary}\n\n${buildSecurityIncidenciaDescription(findings)}`,
    canal: "runtime-integrity-guard",
    createdAt: new Date().toISOString().split("T")[0],
  })
}

export function securityIncidenciaFingerprint(findings: IntegrityFinding[]): string {
  return findings
    .map((item) => item.fingerprint)
    .sort()
    .join("|")
}
