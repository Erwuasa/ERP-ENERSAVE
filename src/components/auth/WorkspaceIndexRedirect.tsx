import { Navigate } from "react-router-dom"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"

export function WorkspaceIndexRedirect() {
  const { isLoggedIn, isBootstrapping, activeUser } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to={ROUTES.login} replace />
  }

  return <Navigate to={getDefaultAppPath(activeUser.role)} replace />
}
