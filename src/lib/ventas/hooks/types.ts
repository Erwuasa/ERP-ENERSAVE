export type VentasRole = "comercial" | "jefe_comercial" | "superadmin"

export interface VentasActor {
  comercialId: string
  comercialName: string
  role: VentasRole
}
