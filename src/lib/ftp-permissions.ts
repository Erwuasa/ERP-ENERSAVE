export function canEditFtp(role: string): boolean {
  return role === "superadmin" || role === "tramitacion"
}
