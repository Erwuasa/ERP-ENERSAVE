import { AlertTriangle, ChevronRight } from "lucide-react"
import type { AppUser } from "@/lib/supabase/app-users"
import type { Profile } from "@/types/profile"
import { ClientesTableSkeleton } from "@/components/ui/skeletons/VentasSkeletons"
import { ENERSAVE_ACTION } from "@/lib/enersave-ui-theme"
import {
  USUARIOS_TD,
  USUARIOS_TH,
  userIndentLevel,
  userInitials,
  userRoleBadgeClass,
  userRoleLabel,
} from "@/pages/erp/usuarios/usuarios-page-utils"

type Props = {
  users: AppUser[]
  directory: AppUser[]
  profiles: Profile[]
  mfaEnrolledIds: string[]
  loading?: boolean
  onOpen: (user: AppUser) => void
}

function resolveManager(
  user: AppUser,
  directory: AppUser[],
  profiles: Profile[]
): { fullName: string } | undefined {
  return (
    directory.find((m) => m.id === user.managerId) ??
    directory.find((m) => m.comercialId === user.managerId) ??
    profiles.find((m) => m.id === user.managerId)
  )
}

function ManagerCell({ user, manager }: { user: AppUser; manager?: { fullName: string } }) {
  if (user.role === "customer") {
    return <span className="text-brand-subtext italic text-[10px]">Web / registro</span>
  }
  if (user.role === "superadmin") {
    return <span className="text-brand-subtext italic text-[10px]">N/A</span>
  }
  if (manager) {
    return <span className="font-medium text-brand-text">{manager.fullName}</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-rose-500 bg-rose-500/5 ring-1 ring-inset ring-rose-500/15 px-2 py-0.5 rounded text-[10px] font-mono">
      <AlertTriangle className="w-3 h-3" />
      No asignado
    </span>
  )
}

function StatusPill({ ok, okLabel, pendingLabel }: { ok: boolean; okLabel: string; pendingLabel: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase ${
        ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {ok ? okLabel : pendingLabel}
    </span>
  )
}

export function UsuariosTable({
  users,
  directory,
  profiles,
  mfaEnrolledIds,
  loading = false,
  onOpen,
}: Props) {
  if (loading && users.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border bg-brand-panel shadow-sm">
        <ClientesTableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-panel shadow-sm dark:shadow-none">
      <table className="w-full min-w-[920px] text-left border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-brand-surface/90">
          <tr className="text-brand-subtext font-mono">
            <th className={USUARIOS_TH}>Usuario</th>
            <th className={USUARIOS_TH}>Rol</th>
            <th className={USUARIOS_TH}>Email</th>
            <th className={USUARIOS_TH}>Jefe / origen</th>
            <th className={USUARIOS_TH}>Acceso</th>
            <th className={USUARIOS_TH}>MFA</th>
            <th className={`${USUARIOS_TH} text-right`}>Ficha</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const manager = resolveManager(user, directory, profiles)
            const indent = userIndentLevel(user)
            return (
              <tr
                key={`${user.source}-${user.id}`}
                onClick={() => onOpen(user)}
                className="hover:bg-brand-bg/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                <td className={USUARIOS_TD}>
                  <div className="flex items-center gap-3" style={{ paddingLeft: indent * 16 }}>
                    <div
                      className={`w-8 h-8 rounded-full border text-[10px] font-extrabold flex items-center justify-center uppercase shrink-0 ${
                        user.role === "customer"
                          ? "bg-brand-surface border-brand-border text-brand-subtext"
                          : indent === 0
                            ? "bg-blue-600 border-blue-500 text-white"
                            : indent === 1
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-500"
                              : "bg-brand-surface border-brand-border text-brand-subtext"
                      }`}
                    >
                      {userInitials(user.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-brand-text truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                        {user.fullName}
                      </p>
                      <p className="text-[10px] font-mono text-brand-subtext truncate">{user.id}</p>
                    </div>
                  </div>
                </td>
                <td className={USUARIOS_TD}>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase ${userRoleBadgeClass(user.role)}`}
                  >
                    {userRoleLabel(user.role)}
                  </span>
                </td>
                <td className={`${USUARIOS_TD} text-brand-subtext font-mono`}>{user.email || "—"}</td>
                <td className={USUARIOS_TD}>
                  <ManagerCell user={user} manager={manager} />
                </td>
                <td className={USUARIOS_TD}>
                  <StatusPill ok={user.hasAuth} okLabel="cuenta" pendingLabel="sin cuenta" />
                </td>
                <td className={USUARIOS_TD}>
                  {user.role === "customer" ? (
                    <span className="text-brand-subtext italic text-[10px]">N/A</span>
                  ) : (
                    <StatusPill
                      ok={mfaEnrolledIds.includes(user.id)}
                      okLabel="activo"
                      pendingLabel="pendiente"
                    />
                  )}
                </td>
                <td className={`${USUARIOS_TD} text-right`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(user)
                    }}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-[10px] font-mono font-bold rounded-lg ${ENERSAVE_ACTION.secondary}`}
                  >
                    {user.role === "customer" ? "Asignar rol" : "Ver permisos"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
