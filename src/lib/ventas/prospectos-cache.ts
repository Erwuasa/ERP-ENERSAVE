import type { Prospecto } from "./types"
import { mergeProspectoLists } from "./prospecto-list-merge"
import type { ListProspectosFilters } from "./types"
import type { VentasActor } from "./hooks/types"

type Listener = () => void

const STORAGE_PREFIX = "enersave-ventas-prospectos-v1:"
const cacheByKey = new Map<string, Prospecto[]>()
const listenersByKey = new Map<string, Set<Listener>>()

function storageKey(cacheKey: string): string {
  return `${STORAGE_PREFIX}${cacheKey}`
}

function readFromStorage(cacheKey: string): Prospecto[] | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(cacheKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Prospecto[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeToStorage(cacheKey: string, list: Prospecto[]): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(storageKey(cacheKey), JSON.stringify(list))
  } catch {
    /* quota or private mode — in-memory cache still works */
  }
}

function removeFromStorage(cacheKey: string): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.removeItem(storageKey(cacheKey))
  } catch {
    /* ignore */
  }
}

export function prospectosCacheKey(
  actor: VentasActor,
  filters?: ListProspectosFilters
): string {
  const comercialFilter =
    actor.role === "comercial" ? actor.comercialId : filters?.comercialId ?? "all"
  return `${actor.role}:${comercialFilter}:${filters?.fase ?? ""}`
}

export function readProspectosCache(key: string): Prospecto[] {
  const memory = cacheByKey.get(key)
  if (memory && memory.length > 0) return memory

  const stored = readFromStorage(key)
  if (stored && stored.length > 0) {
    cacheByKey.set(key, stored)
    return stored
  }

  return memory ?? []
}

export function writeProspectosCache(key: string, list: Prospecto[]): void {
  cacheByKey.set(key, list)
  writeToStorage(key, list)
  const listeners = listenersByKey.get(key)
  if (listeners) {
    for (const listener of listeners) {
      listener()
    }
  }
}

export function mergeProspectosCache(key: string, primary: Prospecto[]): Prospecto[] {
  const merged = mergeProspectoLists(primary, readProspectosCache(key))
  writeProspectosCache(key, merged)
  return merged
}

export function upsertProspectoInCache(key: string, prospecto: Prospecto): Prospecto[] {
  const merged = mergeProspectoLists([prospecto], readProspectosCache(key))
  writeProspectosCache(key, merged)
  return merged
}

export function removeProspectoFromCache(key: string, prospectoId: string): Prospecto[] {
  const next = readProspectosCache(key).filter((p) => p.id !== prospectoId)
  writeProspectosCache(key, next)
  return next
}

/** Solo para tests — limpia memoria y localStorage de una clave. */
export function clearProspectosCache(key: string): void {
  cacheByKey.delete(key)
  removeFromStorage(key)
}

/** Solo memoria (tests / simular recarga de módulo sin perder localStorage). */
export function resetProspectosMemoryCache(key: string): void {
  cacheByKey.delete(key)
}

export function subscribeProspectosCache(key: string, listener: Listener): () => void {
  const set = listenersByKey.get(key) ?? new Set()
  set.add(listener)
  listenersByKey.set(key, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listenersByKey.delete(key)
  }
}
