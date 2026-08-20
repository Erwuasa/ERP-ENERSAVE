import { lazy, Suspense, useMemo } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { getDefaultAppPath, menuTabToPath, pathToMenuTab } from "@/constants/navigation"
import type { AppModule } from "@/constants/navigation"
import { getWorkspaceRouteLoader } from "@/lib/workspaceModuleRegistry"
import { canAccessWorkspaceSegment } from "@/lib/workspaceAccess"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

function workspaceSegmentFromPath(pathname: string): { module: AppModule; segment: string } | null {
  const normalized = pathname.replace(/\/+$/, "") || "/"
  if (normalized === "/erp") return { module: "erp", segment: "" }
  if (normalized === "/ventas") return { module: "ventas", segment: "" }

  const erpMatch = normalized.match(/^\/erp\/(.+)$/)
  if (erpMatch) return { module: "erp", segment: erpMatch[1] }

  const ventasMatch = normalized.match(/^\/ventas\/(.+)$/)
  if (ventasMatch) return { module: "ventas", segment: ventasMatch[1] }

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
  const resolved = useMemo(() => workspaceSegmentFromPath(pathname), [pathname])

  const LazyPage = useMemo(() => {
    if (!resolved?.segment) return null
    const loader = getWorkspaceRouteLoader(resolved.module, resolved.segment)
    return loader ? lazy(loader) : null
  }, [resolved])

  if (!resolved) {
    return <Navigate to={getDefaultAppPath(ws.activeRole)} replace />
  }

  if (resolved.segment === "") {
    const tab = pathToMenuTab(pathname)?.tab ?? "Dashboard"
    return <Navigate to={menuTabToPath(resolved.module, tab)} replace />
  }

  if (!canAccessWorkspaceSegment(ws, resolved.module, resolved.segment)) {
    return <Navigate to={getDefaultAppPath(ws.activeRole)} replace />
  }

  if (!LazyPage) {
    return (
      <section className="rounded-3xl border border-dashed border-brand-border bg-brand-panel/50 p-8 text-center space-y-2">
        <h1 className="text-sm font-bold text-brand-text uppercase tracking-wide">
          Vista no implementada
        </h1>
        <p className="text-xs text-brand-subtext">
          Falta el archivo en{" "}
          <code className="font-mono text-[10px]">
            pages/{resolved.module}/routes/{resolved.segment}.tsx
          </code>
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
