import { Lock } from "lucide-react"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import type { AppUser } from "@/lib/supabase/app-users"
import { UsuariosKpiStrip } from "@/pages/erp/usuarios/UsuariosKpiStrip"
import { UsuariosTable } from "@/pages/erp/usuarios/UsuariosTable"
import { UsuariosToolbar } from "@/pages/erp/usuarios/UsuariosToolbar"
import {
  matchesUserFilters,
  profileFromAppUser,
  sortAppUsers,
} from "@/pages/erp/usuarios/usuarios-page-utils"

function UsuariosAccessDenied({
  role,
  onBack,
}: {
  role: string
  onBack: () => void
}) {
  return (
    <div className="p-8 rounded-2xl border border-brand-border bg-brand-panel text-center space-y-3 max-w-xl mx-auto my-12">
      <Lock className="w-10 h-10 text-brand-subtext/60 mx-auto" />
      <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
        Módulo restringido
      </h3>
      <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed">
        Tu rol ({role}) no puede gestionar usuarios, correos ni permisos.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 bg-brand-surface border border-brand-border hover:bg-brand-panel rounded-xl text-xs font-bold text-brand-text uppercase transition-colors cursor-pointer"
      >
        Volver al Dashboard
      </button>
    </div>
  )
}

export function UsuariosPage() {
  const {
    activeRole,
    profiles,
    appUsers,
    appUsersError,
    userSearchText,
    setUserSearchText,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    setIsCreateOpen,
    isSyncingErpUsers,
    setActiveUserForSheet,
    navigateToTab,
    mfaEnrolledIds,
  } = useErpWorkspaceContext()

  if (activeRole !== "superadmin" && activeRole !== "tramitacion") {
    return (
      <UsuariosAccessDenied
        role={activeRole}
        onBack={() => navigateToTab("erp", "Dashboard")}
      />
    )
  }

  const directory = appUsers
  const filtered = sortAppUsers(directory).filter((user) =>
    matchesUserFilters(user, userSearchText, userRoleFilter, userStatusFilter)
  )

  const kpiSelected =
    userStatusFilter === "cuenta"
      ? ("cuentas" as const)
      : userRoleFilter === "customer"
        ? ("clientes" as const)
        : userStatusFilter === "sin_cuenta"
          ? ("sin_cuenta" as const)
          : null

  function openStaffSheet(user: AppUser) {
    const profile =
      profiles.find((p) => p.id === user.id) ??
      profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase()) ??
      profileFromAppUser(user)
    setActiveUserForSheet(profile)
  }

  return (
    <div className="space-y-2.5 animate-fade-in font-sans">
      <UsuariosKpiStrip
        cuentas={directory.filter((u) => u.hasAuth).length}
        clientes={directory.filter((u) => u.role === "customer").length}
        staff={directory.filter((u) => u.role !== "customer").length}
        sinCuenta={directory.filter((u) => !u.hasAuth).length}
        selected={kpiSelected}
        onSelect={(id) => {
          if (id === "cuentas") {
            setUserStatusFilter(userStatusFilter === "cuenta" ? "all" : "cuenta")
            return
          }
          if (id === "clientes") {
            setUserRoleFilter(userRoleFilter === "customer" ? "all" : "customer")
            return
          }
          if (id === "sin_cuenta") {
            setUserStatusFilter(userStatusFilter === "sin_cuenta" ? "all" : "sin_cuenta")
            return
          }
          setUserRoleFilter("all")
          setUserStatusFilter("all")
        }}
      />

      {appUsersError ? <p className="text-xs text-rose-500">{appUsersError}</p> : null}

      <UsuariosToolbar
        searchText={userSearchText}
        onSearchChange={setUserSearchText}
        roleFilter={userRoleFilter}
        onRoleFilterChange={setUserRoleFilter}
        statusFilter={userStatusFilter}
        onStatusFilterChange={setUserStatusFilter}
        onCreate={() => setIsCreateOpen(true)}
        syncing={isSyncingErpUsers && directory.length > 0}
      />

      <UsuariosTable
        users={filtered}
        directory={directory}
        profiles={profiles}
        mfaEnrolledIds={mfaEnrolledIds}
        loading={isSyncingErpUsers}
        onOpen={openStaffSheet}
      />
    </div>
  )
}
