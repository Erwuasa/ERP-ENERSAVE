import type { ComponentType } from "react"

const CHUNK_RELOAD_PREFIX = "enersave-chunk-reload:"

export function isDynamicImportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("loading chunk") ||
    msg.includes("load failed") ||
    msg.includes("dynamically imported module")
  )
}

export function clearChunkReloadFlags(): void {
  if (typeof sessionStorage === "undefined") return
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(CHUNK_RELOAD_PREFIX)) keys.push(key)
  }
  keys.forEach((key) => sessionStorage.removeItem(key))
}

export type RouteModuleLoader = () => Promise<{ default: ComponentType }>

/** Reintento + recarga única tras deploy (chunks 404 en Vercel). */
export function wrapWorkspaceRouteLoader(
  loader: RouteModuleLoader,
  cacheKey: string
): RouteModuleLoader {
  return async () => {
    const run = () => loader()

    try {
      const mod = await run()
      clearChunkReloadFlags()
      return mod
    } catch (error) {
      if (!isDynamicImportFailure(error)) throw error
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350))

    try {
      const mod = await run()
      clearChunkReloadFlags()
      return mod
    } catch (retryError) {
      if (!isDynamicImportFailure(retryError)) throw retryError

      const reloadKey = `${CHUNK_RELOAD_PREFIX}${cacheKey}`
      const alreadyReloaded = sessionStorage.getItem(reloadKey) === "1"
      if (!alreadyReloaded) {
        sessionStorage.setItem(reloadKey, "1")
        window.location.reload()
        return new Promise(() => {})
      }

      throw retryError
    }
  }
}
