import type { UserRole } from "@/types/profile"

export function isRuntimeIntegrityBlockExempt(input: {
  role: UserRole | string
  integrityGuardBypass?: boolean
}): boolean {
  if (input.role === "superadmin") return true
  return input.integrityGuardBypass === true
}
