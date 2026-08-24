const STORAGE_KEY = "enersave_renewal_alert_dismissed"
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface DismissedEntry {
  contractId: string
  dismissedAt: string
}

function readEntries(): DismissedEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DismissedEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEntries(entries: DismissedEntry[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function dismissRenewalAlert(contractId: string): void {
  const now = new Date().toISOString()
  const entries = readEntries().filter((e) => e.contractId !== contractId)
  entries.push({ contractId, dismissedAt: now })
  writeEntries(entries)
}

export function isRenewalAlertDismissed(contractId: string): boolean {
  const entry = readEntries().find((e) => e.contractId === contractId)
  if (!entry) return false
  const age = Date.now() - new Date(entry.dismissedAt).getTime()
  if (age > DISMISS_TTL_MS) {
    writeEntries(readEntries().filter((e) => e.contractId !== contractId))
    return false
  }
  return true
}

export function contractHasActiveRenewalAlert(
  contractId: string,
  isProxima: boolean
): boolean {
  return isProxima && !isRenewalAlertDismissed(contractId)
}
