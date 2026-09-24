import type { Profile } from "@/types/profile"

export interface ContractComercialDbFields {
  comercial_id: string
  comercial_name: string
  nombre_comercial: string
  jefe_equipo: string | null
}

export function resolveContractComercialDbFields(input: {
  comercialId: string
  comercialName: string
  nombreComercial?: string | null
  sellerProfile?: Pick<Profile, "managerId" | "fullName"> | null
}): ContractComercialDbFields {
  const comercial_id = input.comercialId.trim()
  const comercial_name = (input.comercialName || input.sellerProfile?.fullName || "").trim()
  const nombre_comercial = (input.nombreComercial || comercial_name).trim()
  const jefe_equipo = input.sellerProfile?.managerId?.trim() || null

  return {
    comercial_id,
    comercial_name,
    nombre_comercial,
    jefe_equipo,
  }
}
