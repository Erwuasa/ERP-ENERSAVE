import { Component, type ErrorInfo, type ReactNode } from "react"
import { isDynamicImportFailure } from "@/lib/lazy-route-loader"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState
  declare props: Readonly<ErrorBoundaryProps>

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || "Error desconocido" }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const chunkFailure = isDynamicImportFailure(new Error(this.state.message))
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-brand-bg text-white">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-lg font-bold text-rose-400">
              {chunkFailure ? "Nueva versión del ERP" : "Error al cargar la aplicación"}
            </h1>
            <p className="text-sm text-slate-400 font-mono break-words">
              {chunkFailure
                ? "Recarga la página para cargar los módulos actualizados tras el despliegue."
                : this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
