import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"
import { RefreshCw, Home } from "lucide-react"
import { getDefaultAppPath } from "@/constants/navigation"
import { isDynamicImportFailure } from "@/lib/lazy-route-loader"
import { useAuth } from "@/hooks/useAuth"

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || error.data?.message || `Error ${error.status}`
  }
  if (error instanceof Error) return error.message
  return "Error desconocido"
}

export function WorkspaceRouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { activeUser } = useAuth()

  const chunkFailure = isDynamicImportFailure(error)
  const message = errorMessage(error)

  return (
    <div className="min-h-[min(480px,70vh)] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-brand-border bg-brand-panel p-6 space-y-4 text-center shadow-sm">
        <h1 className="text-sm font-bold uppercase tracking-wide text-brand-text">
          {chunkFailure ? "Actualización del ERP disponible" : "No se pudo abrir esta pantalla"}
        </h1>
        <p className="text-xs text-brand-subtext leading-relaxed">
          {chunkFailure
            ? "Tras un despliegue nuevo, el navegador puede intentar cargar un archivo antiguo. Recarga para obtener la versión actual; no pierdes la sesión."
            : "Ha ocurrido un error al cargar el módulo. Puedes reintentar o volver al inicio de tu panel."}
        </p>
        {!chunkFailure ? (
          <p className="text-[10px] font-mono text-brand-subtext/80 break-words">{message}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recargar aplicación
          </button>
          <button
            type="button"
            onClick={() => navigate(getDefaultAppPath(activeUser.role), { replace: true })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-elevated text-brand-text text-xs font-bold transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4" aria-hidden />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
