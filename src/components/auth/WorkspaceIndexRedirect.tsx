import { Navigate, useLocation } from "react-router-dom"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"

export function WorkspaceIndexRedirect() {
  const { isLoggedIn, isBootstrapping, activeUser } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to={`${ROUTES.login}${location.search}`} replace />
  }

  return <Navigate to={getDefaultAppPath(activeUser.role)} replace />
}
