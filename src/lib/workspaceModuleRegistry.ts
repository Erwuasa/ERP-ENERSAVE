import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import type { AppModule } from "@/constants/navigation"

const erpRouteLoaders = import.meta.glob<{ default: ComponentType }>(
  "../pages/erp/routes/**/*.tsx"
)

const ventasRouteLoaders = import.meta.glob<{ default: ComponentType }>(
  "../pages/ventas/routes/**/*.tsx"
)

type RouteLoader = () => Promise<{ default: ComponentType }>

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/")
}

function buildSegmentMap(
  loaders: Record<string, RouteLoader>,
  module: AppModule
): Map<string, RouteLoader> {
  const prefix = normalizePath(`../pages/${module}/routes/`)
  const map = new Map<string, RouteLoader>()

  for (const [rawKey, loader] of Object.entries(loaders)) {
    const key = normalizePath(rawKey)
    if (!key.startsWith(prefix) || !key.endsWith(".tsx")) continue
    const segment = key.slice(prefix.length, -".tsx".length)
    map.set(segment, loader)
  }

  return map
}

const erpSegmentLoaders = buildSegmentMap(erpRouteLoaders, "erp")
const ventasSegmentLoaders = buildSegmentMap(ventasRouteLoaders, "ventas")

export function getWorkspaceRouteLoader(
  module: AppModule,
  segment: string
): RouteLoader | undefined {
  const map = module === "ventas" ? ventasSegmentLoaders : erpSegmentLoaders
  return map.get(segment)
}

// `lazy()` must be called at most once per loader — each call creates a brand
// new, not-yet-resolved component. Recreating it on every navigation (e.g. via
// a component-scoped useMemo keyed by route) means a route you already visited
// suspends again from scratch instead of rendering the cached module
// immediately, which under React Router's transition-based navigation can
// leave the screen showing the previous page while the URL has already
// changed. Caching the lazy component once per segment, forever, avoids that.
const lazyComponentCache = new Map<string, LazyExoticComponent<ComponentType>>()

export function getWorkspaceRouteComponent(
  module: AppModule,
  segment: string
): LazyExoticComponent<ComponentType> | undefined {
  const cacheKey = `${module}/${segment}`
  const cached = lazyComponentCache.get(cacheKey)
  if (cached) return cached

  const loader = getWorkspaceRouteLoader(module, segment)
  if (!loader) return undefined

  const component = lazy(loader)
  lazyComponentCache.set(cacheKey, component)
  return component
}
