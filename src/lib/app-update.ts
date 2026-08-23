const SNAPSHOT_KEY = 'enersave-app-update-snapshot'
const DISMISSED_VERSION_KEY = 'enersave-app-update-dismissed'

export interface AppUpdateComparadorSnapshot {
  compCups: string
  compClient: string
  compTipo: 'luz' | 'gas'
  compConsumo: number
  compTarifaActual: string
  compSegment: 'residencial' | 'pyme'
  compAccessTariff: '2.0TD' | '3.0TD' | '6.0TD'
  compPotencias: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }
  compConsumos: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }
  compRentMeter: number
  compCurrentBill: number
  compResults: unknown[] | null
  compSummary: unknown | null
}

export interface AppUpdateSnapshot {
  currentMenuTab: string
  activeModule: string
  contractWizardOpen: boolean
  editingContractId: string | null
  contractWizardProspectoId: string | null
  newContractForm: Record<string, unknown>
  ventasFichaProspectoId: string | null
  comparador: AppUpdateComparadorSnapshot
}

type SnapshotProvider = () => AppUpdateSnapshot

let snapshotProvider: SnapshotProvider | null = null

export function setAppUpdateSnapshotProvider(provider: SnapshotProvider | null): void {
  snapshotProvider = provider
}

export function isVersionDismissed(version: string): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(DISMISSED_VERSION_KEY) === version
}

export function dismissAppVersion(version: string): void {
  sessionStorage.setItem(DISMISSED_VERSION_KEY, version)
}

export function performAppUpdate(): void {
  if (snapshotProvider) {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshotProvider()))
  }
  window.location.reload()
}

export function consumeAppUpdateSnapshot(): AppUpdateSnapshot | null {
  const raw = sessionStorage.getItem(SNAPSHOT_KEY)
  sessionStorage.removeItem(SNAPSHOT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppUpdateSnapshot
  } catch {
    return null
  }
}

export function isRemoteVersionNewer(remote: string, local: string): boolean {
  return remote.trim() !== local.trim()
}
