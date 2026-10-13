export type CalendarioAccessRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"

export interface CalendarioProfileRef {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

const STAFF_ROLES = new Set(["superadmin", "jefe_comercial", "comercial", "tramitacion"])

/** Calendario ERP: superadmin, jefes y comerciales (no tramitación). */
export function canAccessErpCalendario(role: CalendarioAccessRole): boolean {
  return role === "superadmin" || role === "jefe_comercial" || role === "comercial"
}

/** Selector lateral de usuarios: solo superadmin. */
export function showCalendarioUserFilter(role: CalendarioAccessRole): boolean {
  return role === "superadmin"
}

export function resolveCalendarioScopeUserIds(
  role: CalendarioAccessRole,
  activeUserId: string,
  profiles: CalendarioProfileRef[]
): Set<string> {
  if (role === "superadmin") {
    return new Set(
      profiles.filter((profile) => STAFF_ROLES.has(profile.role)).map((profile) => profile.id)
    )
  }

  if (role === "jefe_comercial") {
    return new Set(
      profiles
        .filter(
          (profile) => profile.id === activeUserId || profile.managerId === activeUserId
        )
        .map((profile) => profile.id)
    )
  }

  return new Set([activeUserId])
}

/** Usuarios listados en el filtro (solo aplica si showCalendarioUserFilter). */
export function resolveCalendarioFilterUsers(
  role: CalendarioAccessRole,
  activeUserId: string,
  profiles: CalendarioProfileRef[]
): CalendarioProfileRef[] {
  const scope = resolveCalendarioScopeUserIds(role, activeUserId, profiles)
  return profiles
    .filter((profile) => scope.has(profile.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
}

export function calendarioSubtitleForRole(role: CalendarioAccessRole): string {
  if (role === "superadmin") return "Visión global del equipo — filtra por comercial"
  if (role === "jefe_comercial") return "Tus eventos, los de tu equipo y los que os mencionan"
  return "Tus eventos y los que te mencionan"
}

function isCalendarioStaffRole(role: string): role is CalendarioAccessRole {
  return (
    role === "superadmin" ||
    role === "jefe_comercial" ||
    role === "comercial" ||
    role === "tramitacion"
  )
}

/** @RicardoMonsalve a partir del nombre visible. */
export function calendarioMentionHandle(fullName: string): string {
  const handle = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")
  return handle || "Usuario"
}

/** Compañeros con calendario, sin el dueño del evento. */
export function calendarioMentionCandidates(
  profiles: CalendarioProfileRef[],
  ownerId: string
): CalendarioProfileRef[] {
  return profiles
    .filter((profile) => {
      if (profile.id === ownerId) return false
      if (!isCalendarioStaffRole(profile.role)) return false
      return canAccessErpCalendario(profile.role)
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
}

export function normalizeCalendarioMenciones(
  ids: string[],
  ownerId: string,
  allowedIds: Set<string>
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || id === ownerId || !allowedIds.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** El evento es del usuario si lo creó o si está entre las menciones. */
export function eventoMatchesCalendarioUsers(
  evento: { usuarioId: string; menciones?: string[] },
  userIds: Set<string>
): boolean {
  if (userIds.has(evento.usuarioId)) return true
  return (evento.menciones ?? []).some((id) => userIds.has(id))
}
