export const CONTRACTS_TH =
  "px-2.5 py-2 text-[9px] font-semibold uppercase tracking-normal text-brand-subtext align-top border-b border-brand-border whitespace-normal leading-snug"

export const CONTRACTS_TH_SUB =
  "mt-0.5 block text-[9px] font-normal normal-case text-brand-subtext/90 leading-tight"

/** Reserva altura de subtítulo para alinear la primera línea entre columnas. */
export const CONTRACTS_TH_SUB_SPACER =
  "mt-0.5 block text-[9px] font-normal normal-case invisible leading-tight select-none pointer-events-none"

/** Altura fija de fila en la tabla de contratos (todas las celdas deben respetarla). */
export const CONTRACT_TABLE_ROW_HEIGHT_CLASS = "h-[4.5rem] max-h-[4.5rem]"

export const CONTRACTS_TD =
  "px-2.5 py-0 align-middle border-b border-brand-border/70 text-center overflow-hidden"

export const CONTRACTS_TD_LEFT =
  "px-2.5 py-0 align-middle border-b border-brand-border/70 text-left overflow-hidden"

export const CONTRACTS_TD_MIDDLE = CONTRACTS_TD

export interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
  commissionPercentage?: number
  email?: string
}

export function formatActivationDate(iso: string): string {
  const day = iso.trim().slice(0, 10)
  const [y, m, d] = day.split("-")
  if (!y || !m || !d || d.length > 2) return iso
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
  if (role === "jefe_comercial") return "Director Comercial"
  if (role === "comercial") return "Comercial"
  if (role === "tramitacion") return "Tramitación"
  if (role === "superadmin") return "Superadmin"
  return role
}
