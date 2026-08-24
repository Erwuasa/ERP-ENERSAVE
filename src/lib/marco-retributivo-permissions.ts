export type MarcoRetributivoEditorRole =
  | "superadmin"
  | "tramitacion"
  | "jefe_comercial"
  | "comercial"

export function canEditMarcoRetributivo(
  role: MarcoRetributivoEditorRole | string,
  options?: { superadminViewMode?: "tramitacion" | "comercial" }
): boolean {
  if (role === "tramitacion") return true
  if (role === "superadmin") {
    return options?.superadminViewMode !== "comercial"
  }
  return false
}
