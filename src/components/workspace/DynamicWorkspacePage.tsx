import { Suspense, useMemo } from "react"
import { Navigate, useLocation, useParams } from "react-router-dom"
import { getDefaultAppPath, pathToMenuTab } from "@/constants/navigation"
import type { AppModule } from "@/constants/navigation"
import { getWorkspaceRouteComponent } from "@/lib/workspaceModuleRegistry"
import { canAccessWorkspaceSegment } from "@/lib/workspaceAccess"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

function moduleFromPath(pathname: string): AppModule | null {
  if (pathname.startsWith("/ventas")) return "ventas"
  if (pathname.startsWith("/erp")) return "erp"
  return null
}

function WorkspaceTabFallback() {
  return (
    <div className="flex items-center justify-center min-h-[240px]">
      <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function DynamicWorkspacePage() {
  const ws = useErpWorkspaceContext()
  const { pathname } = useLocation()
  const params = useParams()
  const splat = params["*"] ?? ""

  const module = useMemo(() => moduleFromPath(pathname), [pathname])
  const segment = splat.replace(/\/+$/, "")

  const LazyPage = useMemo(() => {
    if (!module || !segment) return null
    return getWorkspaceRouteComponent(module, segment) ?? null
  }, [module, segment])

  if (!module) {
    return <Navigate to={getDefaultAppPath(ws.activeRole)} replace />
  }

  if (!segment) {
    return null
  }

  if (!canAccessWorkspaceSegment(ws, module, segment)) {
    return <Navigate to={getDefaultAppPath(ws.activeRole)} replace />
  }

  if (!LazyPage) {
    const parsed = pathToMenuTab(pathname)
    return (
      <section className="rounded-3xl border border-dashed border-brand-border bg-brand-panel/50 p-8 text-center space-y-2">
        <h1 className="text-sm font-bold text-brand-text uppercase tracking-wide">
          Vista no implementada
        </h1>
        <p className="text-xs text-brand-subtext">
          {parsed
            ? `Ruta ${pathname} sin módulo en pages/${module}/routes/${segment}.tsx`
            : `Ruta desconocida: ${pathname}`}
        </p>
      </section>
    )
  }

  return (
    <Suspense fallback={<WorkspaceTabFallback />}>
      <LazyPage key={pathname} />
    </Suspense>
  )
}
