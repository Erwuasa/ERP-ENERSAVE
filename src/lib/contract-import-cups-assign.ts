import type { Contract } from "@/types/contract"
import type { Profile } from "@/types/profile"

/** CUPS del CRM colaborador → comercial asignado (IDs en Supabase). */
export const IMPORT_CUPS_COMERCIAL_ID: Record<string, string> = {
  ES0031105723137003LW: "cf1a0302-39e2-4ccd-a043-10cc0b386dd4", // Berni
  ES0031105723137004LA: "cf1a0302-39e2-4ccd-a043-10cc0b386dd4",
  ES0218030025299880SW: "83cabea3-8cbb-4c57-b300-9ecc38410882", // Ricardo Monsalve
  ES0031102446453001GY: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0218030078051828HR: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031104754149003BR: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031102589150001VS: "d9148f58-1c60-4806-84d5-029d94276d1a", // Pablo Gutierrez
  ES0031102263903009AW: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102255384003AN: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102230155002YX: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102338075005LB: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102790769001WA: "21654e95-70fd-48fd-b7ea-e17bbf44af7b", // Alejandro Rueda
  ES0339001000080109ZB: "21654e95-70fd-48fd-b7ea-e17bbf44af7b",
  ES0031102771320032NH: "21654e95-70fd-48fd-b7ea-e17bbf44af7b",
  ES0031102244131011ET: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0218030008622117SE: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031102226267008JM: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031104545484070HS: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0021000010971508AE: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031104706434001EV: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  ES0031102227555006PA: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102225587020AN: "d9148f58-1c60-4806-84d5-029d94276d1a",
  ES0031102234093010NG: "d9148f58-1c60-4806-84d5-029d94276d1a",
}

export function normalizeImportCups(cups: string): string {
  return cups.replace(/\s/g, "").toUpperCase()
}

export function resolveImportComercialForCups(
  cups: string,
  profiles: Profile[],
  fallback: { id: string; fullName: string }
): { comercialId: string; comercialName: string; jefeEquipo: string | null } {
  const key = normalizeImportCups(cups)
  const assignedId = IMPORT_CUPS_COMERCIAL_ID[key]
  const profile =
    (assignedId ? profiles.find((p) => p.id === assignedId) : undefined) ??
    profiles.find((p) => p.id === fallback.id)

  const comercialId = profile?.id ?? assignedId ?? fallback.id
  const comercialName =
    profile?.fullName ??
    IMPORT_COMERCIAL_DISPLAY_NAME[assignedId ?? ""] ??
    IMPORT_COMERCIAL_DISPLAY_NAME[comercialId] ??
    fallback.fullName
  const managerId = profile?.managerId?.trim()
  const jefeEquipo = managerId || IMPORT_COMERCIAL_JEFE_ID[comercialId] || null

  return { comercialId, comercialName, jefeEquipo }
}

/** Jefe de equipo conocido cuando no hay perfil en memoria (import / filas legacy). */
export const IMPORT_COMERCIAL_JEFE_ID: Record<string, string> = {
  "cf1a0302-39e2-4ccd-a043-10cc0b386dd4": "21654e95-70fd-48fd-b7ea-e17bbf44af7b", // Berni → Alejandro
  "d9148f58-1c60-4806-84d5-029d94276d1a": "83cabea3-8cbb-4c57-b300-9ecc38410882", // Pablo → Ricardo
}

export const IMPORT_COMERCIAL_DISPLAY_NAME: Record<string, string> = {
  "cf1a0302-39e2-4ccd-a043-10cc0b386dd4": "Berni",
  "83cabea3-8cbb-4c57-b300-9ecc38410882": "Ricardo Monsalve Gonzalez",
  "d9148f58-1c60-4806-84d5-029d94276d1a": "Pablo Gutierrez",
  "21654e95-70fd-48fd-b7ea-e17bbf44af7b": "Alejandro Rueda",
}

export function resolveImportComercialIdForCups(cups: string): string | null {
  return IMPORT_CUPS_COMERCIAL_ID[normalizeImportCups(cups)] ?? null
}

export function applyCupsComercialAssignmentToContract(
  contract: Contract,
  profiles: Profile[] = []
): Contract {
  const key = normalizeImportCups(contract.cups)
  const mappedId = IMPORT_CUPS_COMERCIAL_ID[key]
  if (!mappedId && contract.comercialId?.trim()) return contract

  const assigned = resolveImportComercialForCups(contract.cups, profiles, {
    id: mappedId ?? contract.comercialId?.trim() ?? "",
    fullName:
      contract.comercialName?.trim() ||
      IMPORT_COMERCIAL_DISPLAY_NAME[mappedId ?? ""] ||
      "",
  })

  const jefeEquipo =
    assigned.jefeEquipo ??
    IMPORT_COMERCIAL_JEFE_ID[assigned.comercialId] ??
    contract.jefeEquipo ??
    null

  return {
    ...contract,
    comercialId: assigned.comercialId,
    comercialName:
      assigned.comercialName ||
      IMPORT_COMERCIAL_DISPLAY_NAME[assigned.comercialId] ||
      contract.comercialName,
    nombreComercial:
      assigned.comercialName ||
      IMPORT_COMERCIAL_DISPLAY_NAME[assigned.comercialId] ||
      contract.nombreComercial,
    jefeEquipo: jefeEquipo ?? undefined,
  }
}
