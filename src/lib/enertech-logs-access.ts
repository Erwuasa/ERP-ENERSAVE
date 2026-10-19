import { isOwnerSuperadmin } from "@/lib/owner-access"
import type { UserRole } from "@/types/profile"

/** Logs screen: inbound webhooks, outbound alta and orphan reconciliation. */
export function canAccessEnertechLogs(role: UserRole, email: string | null | undefined): boolean {
  if (role === "tramitacion") return true
  if (role === "superadmin") return isOwnerSuperadmin(role, email)
  return false
}

export function isEnertechLogsSegment(segment: string): boolean {
  return segment === "logs" || segment === "enertech-webhooks"
}
