import { Suspense } from "react"
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { WorkspaceIndexRedirect } from "@/components/auth/WorkspaceIndexRedirect"
import { WorkspaceModuleIndexRedirect } from "@/components/auth/WorkspaceModuleIndexRedirect"
import { DynamicWorkspacePage } from "@/components/workspace/DynamicWorkspacePage"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { ErpDataProvider } from "@/providers/ErpDataProvider"
import { ContractActionsProvider } from "@/providers/ContractActionsProvider"
import { ROUTES } from "@/constants/navigation"
import { LoginPage } from "@/pages/auth/LoginPage"
import { RegisterPage } from "@/pages/auth/RegisterPage"
import { CustomerDashboardPage } from "@/pages/customer/CustomerDashboardPage"
import { ErpWorkspaceShell } from "@/pages/erp/ErpWorkspace"
import { IncidenciasProvider } from "@/pages/erp/incidencias/IncidenciasProvider"
import { ErpWorkspaceProvider } from "@/pages/erp/providers/ErpWorkspaceProvider"

function WorkspaceFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AuthLayout() {
  return (
    <AuthProvider>
      <ErpDataProvider>
        <ContractActionsProvider>
          <Outlet />
        </ContractActionsProvider>
      </ErpDataProvider>
    </AuthProvider>
  )
}

function ProtectedWorkspaceLayout() {
  const { profiles, activeUser } = useAuth()
  const teamMemberIds = profiles
    .filter((p) => p.managerId === activeUser.id)
    .map((p) => p.id)
  const isErpOpsAdmin =
    activeUser.role === "superadmin" || activeUser.role === "tramitacion"

  return (
    <ProtectedRoute area="staff">
      <IncidenciasProvider teamMemberIds={teamMemberIds} isErpOpsAdmin={isErpOpsAdmin}>
        <ErpWorkspaceProvider>
          <Suspense fallback={<WorkspaceFallback />}>
            <ErpWorkspaceShell />
          </Suspense>
        </ErpWorkspaceProvider>
      </IncidenciasProvider>
    </ProtectedRoute>
  )
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.login,
        element: <LoginPage />,
      },
      {
        path: ROUTES.register,
        element: <RegisterPage />,
      },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <WorkspaceIndexRedirect />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.customer.root,
        element: (
          <ProtectedRoute area="customer">
            <CustomerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/erp",
        element: <ProtectedWorkspaceLayout />,
        children: [
          { index: true, element: <WorkspaceModuleIndexRedirect module="erp" /> },
          { path: "*", element: <DynamicWorkspacePage /> },
        ],
      },
      {
        path: "/ventas",
        element: <ProtectedWorkspaceLayout />,
        children: [
          { index: true, element: <WorkspaceModuleIndexRedirect module="ventas" /> },
          { path: "*", element: <DynamicWorkspacePage /> },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
