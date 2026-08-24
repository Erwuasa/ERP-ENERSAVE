const USER_CALENDAR_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#4f46e5",
  "#0d9488",
  "#ea580c",
] as const

export function colorForCalendarioUsuario(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return USER_CALENDAR_COLORS[hash % USER_CALENDAR_COLORS.length]
}

export function tipoCalendarioLabel(tipo: string): string {
  if (tipo === "vacaciones") return "Vacaciones"
  if (tipo === "ausencia") return "Ausencia"
  if (tipo === "reunion") return "Reunión"
  return "Evento"
}
