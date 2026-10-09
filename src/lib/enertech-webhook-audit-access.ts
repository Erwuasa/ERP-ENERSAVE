import { isOwnerSuperadmin } from "@/lib/owner-access"
import type { UserRole } from "@/types/profile"

/** ERP audit UI for Enertech webhook inbox (RLS still enforces staff read). */
export function canAccessEnertechWebhookAudit(
  role: UserRole,
  email: string | null | undefined
): boolean {
  if (role === "tramitacion") return true
  if (role === "superadmin") return isOwnerSuperadmin(role, email)
  return false
}

export function isEnertechWebhookAuditSegment(segment: string): boolean {
  return segment === "enertech-webhooks"
}
