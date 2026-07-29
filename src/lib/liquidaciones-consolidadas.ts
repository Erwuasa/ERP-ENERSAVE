import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import { isDateInRange, toIsoDate } from "./date-range"

export type LiquidacionesConsolidadasView = "overview" | "jefes_equipo" | "comerciales"

export interface LiquidacionesProfile {
  id: string
  fullName: string
  role: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  managerId?: string | null
  commissionPercentage: number
}

export function filterContractsByDateRange(
  contracts: Contract[],
  from?: Date | null,
  to?: Date | null
): Contract[] {
  if (!from && !to) return contracts
  const fromIso = from ? toIsoDate(from) : ""
  const toIso = to ? toIsoDate(to) : ""
  return contracts.filter((c) => isDateInRange(c.createdAt, fromIso, toIso))
}

export function filterSettlementsByDateRange(
  settlements: Settlement[],
  from?: Date | null,
  to?: Date | null
): Settlement[] {
  if (!from && !to) return settlements
  const fromIso = from ? toIsoDate(from) : ""
  const toIso = to ? toIsoDate(to) : ""
  return settlements.filter((s) => isDateInRange(s.createdAt, fromIso, toIso))
}

export function calcFacturacionEnerSave(contracts: Contract[]): number {
  return contracts.reduce((sum, c) => sum + (c.montoInterno ?? 0), 0)
}

export function calcPagoPorComisionado(
  montoInterno: number,
  commissionPercentage: number
): number {
  return montoInterno * (commissionPercentage / 100)
}

export function calcLiquidacionComerciales(
  contracts: Contract[],
  profiles: LiquidacionesProfile[]
): number {
  const comerciales = new Set(
    profiles.filter((p) => p.role === "comercial").map((p) => p.id)
  )
  return contracts.reduce((sum, c) => {
    if (!comerciales.has(c.comercialId)) return sum
    const profile = profiles.find((p) => p.id === c.comercialId)
    if (!profile) return sum
    return sum + calcPagoPorComisionado(c.montoInterno ?? 0, profile.commissionPercentage)
  }, 0)
}

export function calcJefePagoOnContract(
  contract: Contract,
  jefe: LiquidacionesProfile,
  agent: LiquidacionesProfile
): number {
  if (agent.id === jefe.id) {
    return calcPagoPorComisionado(contract.montoInterno ?? 0, jefe.commissionPercentage)
  }
  const overridePct = jefe.commissionPercentage - agent.commissionPercentage
  if (overridePct <= 0) return 0
  return calcPagoPorComisionado(contract.montoInterno ?? 0, overridePct)
}

export function calcLiquidacionJefesEquipo(
  contracts: Contract[],
  profiles: LiquidacionesProfile[]
): number {
  const jefes = profiles.filter((p) => p.role === "jefe_comercial")
  let total = 0
  for (const jefe of jefes) {
    const teamIds = new Set(
      profiles.filter((p) => p.managerId === jefe.id).map((p) => p.id)
    )
    teamIds.add(jefe.id)
    for (const contract of contracts) {
      if (!teamIds.has(contract.comercialId)) continue
      const agent = profiles.find((p) => p.id === contract.comercialId)
      if (!agent) continue
      total += calcJefePagoOnContract(contract, jefe, agent)
    }
  }
  return total
}

export function calcLiquidacionSuperadmin(
  contracts: Contract[],
  profiles: LiquidacionesProfile[]
): number {
  const superadmins = new Set(
    profiles.filter((p) => p.role === "superadmin").map((p) => p.id)
  )
  return contracts.reduce((sum, c) => {
    if (!superadmins.has(c.comercialId)) return sum
    const profile = profiles.find((p) => p.id === c.comercialId)
    if (!profile) return sum
    return sum + calcPagoPorComisionado(c.montoInterno ?? 0, profile.commissionPercentage)
  }, 0)
}

export function calcRetrocomisionesTotal(
  settlements: Settlement[],
  contracts: Contract[]
): number {
  const fromSettlements = settlements
    .filter((s) => (s.montoInterno ?? 0) < 0)
    .reduce((sum, s) => sum + Math.abs(s.montoInterno ?? 0), 0)
  const fromContracts = contracts.reduce(
    (sum, c) => sum + (c.retrocomisionClawback ?? 0),
    0
  )
  return fromSettlements + fromContracts
}

export function calcCajaNetaEnerSave(
  facturacion: number,
  liquidacionComerciales: number,
  liquidacionJefes: number,
  liquidacionSuperadmin: number,
  retrocomisiones: number
): number {
  return (
    facturacion -
    liquidacionComerciales -
    liquidacionJefes -
    liquidacionSuperadmin -
    retrocomisiones
  )
}

export interface JefeEquipoResumen {
  jefe: LiquidacionesProfile
  contratosPropios: number
  contratosEquipo: number
  comercialesEnEquipo: number
  liquidacionTotal: number
  porCompania: {
    compania: string
    contratos: number
    facturacionEnerSave: number
    liquidacion: number
  }[]
}

export function buildJefesEquipoResumen(
  contracts: Contract[],
  profiles: LiquidacionesProfile[]
): JefeEquipoResumen[] {
  const jefes = profiles.filter((p) => p.role === "jefe_comercial")
  return jefes.map((jefe) => {
    const teamMemberIds = profiles
      .filter((p) => p.managerId === jefe.id && p.role === "comercial")
      .map((p) => p.id)
    const teamIds = new Set([...teamMemberIds, jefe.id])
    const scoped = contracts.filter((c) => teamIds.has(c.comercialId))
    const propios = scoped.filter((c) => c.comercialId === jefe.id)
    const delEquipo = scoped.filter((c) => c.comercialId !== jefe.id)

    const porCompaniaMap = new Map<
      string,
      { contratos: number; facturacionEnerSave: number; liquidacion: number }
    >()

    for (const contract of scoped) {
      const agent = profiles.find((p) => p.id === contract.comercialId)
      if (!agent) continue
      const compania = contract.compania || "Sin compañía"
      const entry = porCompaniaMap.get(compania) ?? {
        contratos: 0,
        facturacionEnerSave: 0,
        liquidacion: 0,
      }
      entry.contratos += 1
      entry.facturacionEnerSave += contract.montoInterno ?? 0
      entry.liquidacion += calcJefePagoOnContract(contract, jefe, agent)
      porCompaniaMap.set(compania, entry)
    }

    return {
      jefe,
      contratosPropios: propios.length,
      contratosEquipo: delEquipo.length,
      comercialesEnEquipo: teamMemberIds.length,
      liquidacionTotal: scoped.reduce((sum, c) => {
        const agent = profiles.find((p) => p.id === c.comercialId)
        if (!agent) return sum
        return sum + calcJefePagoOnContract(c, jefe, agent)
      }, 0),
      porCompania: Array.from(porCompaniaMap.entries())
        .map(([compania, data]) => ({ compania, ...data }))
        .sort((a, b) => b.facturacionEnerSave - a.facturacionEnerSave),
    }
  })
}

export interface ComercialLiquidacionResumen {
  comercial: LiquidacionesProfile
  contratos: number
  facturacionGenerada: number
  aPagar: number
  porCompania: { compania: string; contratos: number; aPagar: number }[]
}

export function buildComercialesLiquidacionResumen(
  contracts: Contract[],
  profiles: LiquidacionesProfile[]
): ComercialLiquidacionResumen[] {
  const comerciales = profiles.filter((p) => p.role === "comercial")
  return comerciales.map((comercial) => {
    const scoped = contracts.filter((c) => c.comercialId === comercial.id)
    const porCompaniaMap = new Map<string, { contratos: number; aPagar: number }>()

    for (const contract of scoped) {
      const compania = contract.compania || "Sin compañía"
      const entry = porCompaniaMap.get(compania) ?? { contratos: 0, aPagar: 0 }
      entry.contratos += 1
      entry.aPagar += calcPagoPorComisionado(
        contract.montoInterno ?? 0,
        comercial.commissionPercentage
      )
      porCompaniaMap.set(compania, entry)
    }

    const aPagar = scoped.reduce(
      (sum, c) =>
        sum + calcPagoPorComisionado(c.montoInterno ?? 0, comercial.commissionPercentage),
      0
    )

    return {
      comercial,
      contratos: scoped.length,
      facturacionGenerada: scoped.reduce((s, c) => s + (c.montoInterno ?? 0), 0),
      aPagar,
      porCompania: Array.from(porCompaniaMap.entries())
        .map(([compania, data]) => ({ compania, ...data }))
        .sort((a, b) => b.aPagar - a.aPagar),
    }
  })
}
