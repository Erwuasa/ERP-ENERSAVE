import { lazy, Suspense } from "react"
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AuthProvider } from "@/hooks/useAuth"
import { ErpDataProvider } from "@/providers/ErpDataProvider"
import { ContractActionsProvider } from "@/providers/ContractActionsProvider"
import { ROUTES } from "@/constants/navigation"
import { LoginPage } from "@/pages/auth/LoginPage"

const ErpWorkspace = lazy(() =>
  import("@/pages/erp/ErpWorkspace").then((m) => ({ default: m.ErpWorkspace }))
)

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

function ProtectedWorkspace() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<WorkspaceFallback />}>
        <ErpWorkspace />
      </Suspense>
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
        path: "/",
        element: <ProtectedWorkspace />,
      },
      {
        path: "/erp/*",
        element: <ProtectedWorkspace />,
      },
      {
        path: "/ventas/*",
        element: <ProtectedWorkspace />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
