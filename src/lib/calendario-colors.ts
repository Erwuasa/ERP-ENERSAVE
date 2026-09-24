/** Paleta EnerSave (cyan/teal/ámbar/violeta — sin grises apagados). */
const USER_CALENDAR_COLORS = [
  "#0891b2",
  "#06b6d4",
  "#0d9488",
  "#f59e0b",
  "#8b5cf6",
  "#0284c7",
  "#14b8a6",
  "#d97706",
  "#6366f1",
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
