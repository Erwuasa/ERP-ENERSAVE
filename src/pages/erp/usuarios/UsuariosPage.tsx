import { Lock, Users } from "lucide-react"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import type { AppUser } from "@/lib/supabase/app-users"
import { UsuariosTable } from "@/pages/erp/usuarios/UsuariosTable"
import { UsuariosToolbar } from "@/pages/erp/usuarios/UsuariosToolbar"
import { getErpComercialCommissionPercentage } from "@/lib/supabase/erp-comerciales"
import {
  isPlatformAppUser,
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
    setProfiles,
    navigateToTab,
    mfaEnrolledIds,
  } = useErpWorkspaceContext()

  if (activeRole !== "superadmin") {
    return (
      <UsuariosAccessDenied
        role={activeRole}
        onBack={() => navigateToTab("erp", "Dashboard")}
      />
    )
  }

  const directory = appUsers.filter(isPlatformAppUser)
  const filtered = sortAppUsers(directory).filter((user) =>
    matchesUserFilters(user, userSearchText, userRoleFilter, userStatusFilter)
  )

  function openStaffSheet(user: AppUser) {
    const fromDirectory =
      profiles.find((p) => p.id === user.id) ??
      profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase())
    const profile = fromDirectory ?? profileFromAppUser(user)
    setActiveUserForSheet(profile)

    if (user.role !== "comercial" && user.role !== "jefe_comercial") return

    void getErpComercialCommissionPercentage(profile.id).then((result) => {
      if (result.ok === false) return
      const commissionPercentage = result.data
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, commissionPercentage } : p))
      )
      setActiveUserForSheet((prev) =>
        prev && prev.id === profile.id ? { ...prev, commissionPercentage } : prev
      )
    })
  }

  const countLabel = filtered.length === 1 ? "usuario" : "usuarios"

  return (
    <div className="animate-fade-in font-sans">
      {appUsersError ? <p className="mb-3 text-xs text-rose-500">{appUsersError}</p> : null}

      <section className="rounded-3xl border border-brand-border bg-brand-panel p-4 shadow-sm sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 border-b border-brand-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
              <Users className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-brand-text">
                Usuarios
              </h2>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                {filtered.length} {countLabel}
                {isSyncingErpUsers && directory.length > 0 ? " · sincronizando" : ""}
                {" · "}
                el % de comisión se aplica sobre el marco
              </p>
            </div>
          </div>
        </div>

      <UsuariosToolbar
        searchText={userSearchText}
        onSearchChange={setUserSearchText}
        roleFilter={userRoleFilter}
        onRoleFilterChange={setUserRoleFilter}
        statusFilter={userStatusFilter}
        onStatusFilterChange={setUserStatusFilter}
        onCreate={() => setIsCreateOpen(true)}
      />

      <UsuariosTable
        users={filtered}
        directory={directory}
        profiles={profiles}
        mfaEnrolledIds={mfaEnrolledIds}
        loading={isSyncingErpUsers}
        onOpen={openStaffSheet}
      />
      </section>
    </div>
  )
}
