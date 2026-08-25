import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
import { isStaffRole } from "@/types/profile"

export function ProtectedRoute({
  children,
  area = "staff",
}: {
  children: ReactNode
  area?: "staff" | "customer"
}) {
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
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  if (area === "staff" && !isStaffRole(activeUser.role)) {
    return <Navigate to={ROUTES.customer.dashboard} replace />
  }

  if (area === "customer" && isStaffRole(activeUser.role)) {
    return <Navigate to={getDefaultAppPath(activeUser.role)} replace />
  }

  return children
}
