export type MarcoRetributivoEditorRole =
  | "superadmin"
  | "tramitacion"
  | "jefe_comercial"
  | "comercial"

export function canViewMarcoRetributivo(
  role: MarcoRetributivoEditorRole | string,
  _options?: { superadminViewMode?: "tramitacion" | "comercial" }
): boolean {
  return (
    role === "jefe_comercial" ||
    role === "comercial" ||
    role === "tramitacion" ||
    role === "superadmin"
  )
}

/** Edición marco: tramitación o superadmin en vista tramitación operativa. */
export function canEditMarcoRetributivo(
  role: MarcoRetributivoEditorRole | string,
  options?: { superadminViewMode?: "tramitacion" | "comercial" }
): boolean {
  if (role === "tramitacion") return true
  if (role === "superadmin") {
    return options?.superadminViewMode === "tramitacion"
  }
  return false
}

/** Modal ERP/Web y columnas admin en tarifas: misma regla que edición operativa. */
export function canManageTariffSettings(
  role: MarcoRetributivoEditorRole | string,
  options?: { superadminViewMode?: "tramitacion" | "comercial" }
): boolean {
  return canEditMarcoRetributivo(role, options)
}

/** @deprecated Usar canManageTariffSettings */
export function canEditTariffSettings(
  role: MarcoRetributivoEditorRole | string,
  options?: { superadminViewMode?: "tramitacion" | "comercial" }
): boolean {
  return canManageTariffSettings(role, options)
}
