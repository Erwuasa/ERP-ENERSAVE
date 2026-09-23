import { AT_OUTBOUND_OWNER_EMAIL } from "./at-outbound-map"
import type { UserRole } from "@/types/profile"

export function canToggleAtOutboundApi(role: UserRole, email: string | null | undefined): boolean {
  if (role !== "superadmin") return false
  const normalized = (email ?? "").trim().toLowerCase()
  return normalized === AT_OUTBOUND_OWNER_EMAIL.toLowerCase()
}
