import type {
  LiquidacionesProfile,
  LiquidacionesRole,
  PendingLiquidacionContract,
} from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"

export const LIQUIDACIONES_COMPANIA_TABS = [
  "Todos",
  "Niba",
  "Global Connect",
  "Axpo",
  "Iberdesa",
  "Factorenergia",
  "Octopus",
  "Ignis",
  "Repsol",
  "TotalEnergies",
  "Endesa",
] as const

export function getDirectReports(
  profiles: LiquidacionesProfile[],
  managerId: string
): LiquidacionesProfile[] {
  return profiles.filter((p) => p.managerId === managerId)
}

export function isTeamReport(
  contract: PendingLiquidacionContract,
  profiles: LiquidacionesProfile[],
  activeUserId: string
): boolean {
  const directReports = getDirectReports(profiles, activeUserId)
  return directReports.some((r) => r.id === contract.agentId) || contract.agentId === activeUserId
}

export function isContractVisibleForRole(
  contract: PendingLiquidacionContract,
  activeRole: LiquidacionesRole,
  activeUserId: string,
  profiles: LiquidacionesProfile[]
): boolean {
  if (activeRole === "jefe_comercial") {
    return isTeamReport(contract, profiles, activeUserId)
  }
  if (activeRole === "comercial") {
    return contract.agentId === activeUserId
  }
  return true
}

export function matchesCompaniaTab(contract: PendingLiquidacionContract, tab: string): boolean {
  return tab === "Todos" || contract.brand.toLowerCase() === tab.toLowerCase()
}

export function matchesLiquidacionesSearch(
  contract: PendingLiquidacionContract,
  query: string
): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return (
    contract.clientName.toLowerCase().includes(q) ||
    contract.cups.toLowerCase().includes(q) ||
    contract.brand.toLowerCase().includes(q)
  )
}

export function filterPendingContracts(
  contracts: PendingLiquidacionContract[],
  opts: {
    activeRole: LiquidacionesRole
    activeUserId: string
    profiles: LiquidacionesProfile[]
    companiaTab: string
    searchQuery?: string
  }
): PendingLiquidacionContract[] {
  return contracts.filter((c) => {
    if (!isContractVisibleForRole(c, opts.activeRole, opts.activeUserId, opts.profiles)) {
      return false
    }
    if (!matchesCompaniaTab(c, opts.companiaTab)) return false
    if (opts.searchQuery && !matchesLiquidacionesSearch(c, opts.searchQuery)) return false
    return true
  })
}

export function countPendingByCompaniaTab(
  contracts: PendingLiquidacionContract[],
  tab: string,
  activeRole: LiquidacionesRole,
  activeUserId: string,
  profiles: LiquidacionesProfile[]
): number {
  return contracts.filter((c) => {
    if (!isContractVisibleForRole(c, activeRole, activeUserId, profiles)) return false
    return matchesCompaniaTab(c, tab)
  }).length
}

export function computeRealCommission(
  contract: PendingLiquidacionContract,
  profiles: LiquidacionesProfile[]
): number {
  const advisor = profiles.find((p) => p.id === contract.agentId)
  const rateMultiplier = advisor ? advisor.commissionPercentage / 100 : 1
  return contract.price * rateMultiplier
}

export function groupPendingByBrand(
  contracts: PendingLiquidacionContract[],
  profiles: LiquidacionesProfile[]
): Record<string, { count: number; sum: number }> {
  const grouped: Record<string, { count: number; sum: number }> = {}
  for (const c of contracts) {
    if (!grouped[c.brand]) grouped[c.brand] = { count: 0, sum: 0 }
    grouped[c.brand].count++
    grouped[c.brand].sum += computeRealCommission(c, profiles)
  }
  return grouped
}

export function computeJefeComercialMetrics(
  pendingContracts: PendingLiquidacionContract[],
  profiles: LiquidacionesProfile[],
  activeUserId: string,
  leaderCommissionPercentage: number
) {
  const teamContracts = pendingContracts.filter((c) => isTeamReport(c, profiles, activeUserId))
  const directReports = getDirectReports(profiles, activeUserId)

  const externalBilling = teamContracts.reduce((sum, c) => sum + c.price, 0)

  const internalLiquidated = pendingContracts
    .filter((c) => directReports.some((r) => r.id === c.agentId))
    .reduce((sum, c) => {
      const agent = profiles.find((p) => p.id === c.agentId)
      const percent = agent?.commissionPercentage ?? 0
      return sum + (c.price * percent) / 100
    }, 0)

  const overrideMargin = pendingContracts
    .filter((c) => c.agentId !== activeUserId)
    .reduce((sum, c) => {
      const agent = profiles.find((p) => p.id === c.agentId)
      if (!agent) return sum
      const diff = leaderCommissionPercentage - agent.commissionPercentage
      return sum + c.price * (diff / 100)
    }, 0)

  const agentOverrides = directReports.map((agent) => {
    const difference = leaderCommissionPercentage - agent.commissionPercentage
    const agentSales = pendingContracts
      .filter((c) => c.agentId === agent.id)
      .reduce((sum, c) => sum + c.price, 0)
    return {
      agent,
      difference,
      agentSales,
      overrideEarned: agentSales * (difference / 100),
    }
  })

  return { externalBilling, internalLiquidated, overrideMargin, agentOverrides }
}

export type JefeComercialMetrics = ReturnType<typeof computeJefeComercialMetrics>
