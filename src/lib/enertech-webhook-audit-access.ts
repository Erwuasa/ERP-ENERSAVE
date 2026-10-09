import { canToggleAtOutboundApi } from "@/lib/at-api-toggle"
import type { UserRole } from "@/types/profile"

/** ERP audit UI for Enertech webhook inbox (RLS still enforces staff read). */
export function canAccessEnertechWebhookAudit(
  role: UserRole,
  email: string | null | undefined
): boolean {
  if (role === "tramitacion") return true
  if (role === "superadmin") return canToggleAtOutboundApi(role, email)
  return false
}

export function isEnertechWebhookAuditSegment(segment: string): boolean {
  return segment === "enertech-webhooks"
}
