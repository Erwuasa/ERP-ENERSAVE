import type { ErpComercial } from "../types/erp-comercial"
import type { ErpComercialRow } from "./supabase/erp-comerciales"

export const FISCAL_PROFILE_FIELDS = [
  "dni",
  "direccion",
  "ciudad",
  "codigoPostal",
  "telefono",
  "iban",
] as const

export type FiscalProfileField = (typeof FISCAL_PROFILE_FIELDS)[number]

export interface ComercialFiscalForm {
  dni: string
  direccion: string
  ciudad: string
  codigoPostal: string
  telefono: string
  iban: string
}

export function emptyComercialFiscalForm(): ComercialFiscalForm {
  return {
    dni: "",
    direccion: "",
    ciudad: "",
    codigoPostal: "",
    telefono: "",
    iban: "",
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim()
}

export function erpComercialFromRow(row: ErpComercialRow): ErpComercial {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? "",
    commissionPercentage: row.commission_percentage,
    activo: row.activo !== false,
    dni: normalize(row.dni),
    direccion: normalize(row.direccion),
    ciudad: normalize(row.ciudad),
    codigoPostal: normalize(row.codigo_postal),
    telefono: normalize(row.telefono),
    iban: normalize(row.iban),
  }
}

export function erpComercialFromProfile(profile: {
  id: string
  fullName: string
  email: string
  commissionPercentage: number
  status?: string
  dni?: string
  direccion?: string
  ciudad?: string
  codigoPostal?: string
  telefono?: string
  iban?: string
}): ErpComercial {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    commissionPercentage: profile.commissionPercentage,
    activo: profile.status !== "suspendido",
    dni: normalize(profile.dni),
    direccion: normalize(profile.direccion),
    ciudad: normalize(profile.ciudad),
    codigoPostal: normalize(profile.codigoPostal),
    telefono: normalize(profile.telefono),
    iban: normalize(profile.iban),
  }
}

export function fiscalFormFromComercial(comercial: Pick<ErpComercial, FiscalProfileField>): ComercialFiscalForm {
  return {
    dni: comercial.dni,
    direccion: comercial.direccion,
    ciudad: comercial.ciudad,
    codigoPostal: comercial.codigoPostal,
    telefono: comercial.telefono,
    iban: comercial.iban,
  }
}

export function getMissingFiscalFields(
  comercial: Pick<ErpComercial, FiscalProfileField>
): FiscalProfileField[] {
  return FISCAL_PROFILE_FIELDS.filter((field) => !normalize(comercial[field]))
}

export function isComercialFiscalProfileComplete(
  comercial: Pick<ErpComercial, FiscalProfileField>
): boolean {
  return getMissingFiscalFields(comercial).length === 0
}
