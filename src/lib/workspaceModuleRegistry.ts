import type { ComponentType } from "react"
import type { AppModule } from "@/constants/navigation"

const erpRouteLoaders = import.meta.glob<{ default: ComponentType }>(
  "../pages/erp/routes/**/*.tsx"
)

const ventasRouteLoaders = import.meta.glob<{ default: ComponentType }>(
  "../pages/ventas/routes/**/*.tsx"
)

function loaderKey(module: AppModule, segment: string): string {
  return module === "ventas"
    ? `../pages/ventas/routes/${segment}.tsx`
    : `../pages/erp/routes/${segment}.tsx`
}

export function getWorkspaceRouteLoader(
  module: AppModule,
  segment: string
): (() => Promise<{ default: ComponentType }>) | undefined {
  const loaders = module === "ventas" ? ventasRouteLoaders : erpRouteLoaders
  return loaders[loaderKey(module, segment)] as
    | (() => Promise<{ default: ComponentType }>)
    | undefined
}
