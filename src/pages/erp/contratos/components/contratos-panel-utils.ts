export const CONTRACTS_TH =
  "px-2 py-2 text-[9px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-normal leading-snug"

export const CONTRACTS_TD = "px-2 py-2.5 align-top border-b border-brand-border/70"

export interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
  commissionPercentage?: number
  email?: string
}

export function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function mesesFraccionRenovacion(dias: number): string {
  const meses = Math.max(0, Math.round((dias / 365) * 12))
  return `${meses}/12`
}

export function matchesCreatedAtRange(createdAt: string, desde: string, hasta: string): boolean {
  if (desde && createdAt < desde) return false
  if (hasta && createdAt > hasta) return false
  return true
}

export function profileRoleLabel(role: string): string {
  if (role === "jefe_comercial") return "Director Comercial / Jefe de Equipo"
  if (role === "comercial") return "Comercial"
  if (role === "tramitacion") return "Tramitación"
  if (role === "superadmin") return "Superadmin"
  return role
}
