import type { UserRole } from "@/types/profile"

/** Email of the business owner (superadmin), used to gate owner-only screens/toggles. */
export const OWNER_EMAIL = "germanbayonr@gmail.com"

/** True only for the superadmin matching OWNER_EMAIL (case-insensitive). */
export function isOwnerSuperadmin(role: UserRole, email: string | null | undefined): boolean {
  if (role !== "superadmin") return false
  const normalized = (email ?? "").trim().toLowerCase()
  return normalized === OWNER_EMAIL.toLowerCase()
}
