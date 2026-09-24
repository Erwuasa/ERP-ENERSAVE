import { Component, type ErrorInfo, type ReactNode } from "react"
import { RefreshCw, Home } from "lucide-react"
import { isDynamicImportFailure } from "@/lib/lazy-route-loader"

interface Props {
  children: ReactNode
  onGoHome: () => void
}

interface State {
  error: Error | null
}

export class WorkspaceLazyErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[WorkspaceLazyErrorBoundary]", error, info.componentStack)
  }

  private handleRetry = () => {
    if (this.state.error && isDynamicImportFailure(this.state.error)) {
      window.location.reload()
      return
    }
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const chunkFailure = isDynamicImportFailure(error)

    return (
      <div className="flex items-center justify-center min-h-[240px] p-6">
        <div className="max-w-md w-full rounded-2xl border border-brand-border bg-brand-panel p-5 space-y-3 text-center">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-text">
            {chunkFailure ? "Actualización pendiente de cargar" : "Error en esta pantalla"}
          </h2>
          <p className="text-[11px] text-brand-subtext leading-relaxed">
            {chunkFailure
              ? "Recarga para sincronizar con la última versión desplegada."
              : error.message || "Error desconocido"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {chunkFailure ? "Recargar" : "Reintentar"}
            </button>
            <button
              type="button"
              onClick={this.props.onGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-border text-brand-text text-[11px] font-bold cursor-pointer transition-colors hover:bg-brand-surface"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              Inicio
            </button>
          </div>
        </div>
      </div>
    )
  }
}
