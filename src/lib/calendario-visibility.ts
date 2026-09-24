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
  if (role === "jefe_comercial") return "Tus eventos y los de tu equipo comercial"
  return "Tus eventos, vacaciones y reuniones"
}
