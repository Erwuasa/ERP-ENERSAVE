import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { ShieldCheck, SlidersHorizontal, Trash2, X } from "lucide-react"
import { mfaStatusLabel } from "@/lib/admin-mfa-policy"
import { fetchAdminMfaStatus } from "@/lib/supabase/admin-mfa"

export type UserControlRole = "superadmin" | "jefe_comercial" | "comercial"

export interface UserControlProfile {
  id: string
  fullName: string
  role: UserControlRole
  managerId: string | null
  email: string
  status: "activo" | "suspendido" | "pendiente"
  commissionPercentage: number
  permissions: {
    contractsView: boolean
    comparatorAccess: boolean
    quickSettlement: boolean
    exportDatabase?: boolean
    viewRetrocommissions?: boolean
  }
}

interface ManagerOption {
  id: string
  fullName: string
}

interface UserControlSheetProps {
  user: UserControlProfile
  managers: ManagerOption[]
  open: boolean
  saving?: boolean
  deleting?: boolean
  canDelete?: boolean
  currentUserId?: string
  onClose: () => void
  onChange: (user: UserControlProfile) => void
  onSaveRole: (role: UserControlRole, managerId: string | null) => Promise<void>
  onTogglePermission: (key: keyof UserControlProfile["permissions"]) => void
  onDelete?: () => void
  mfaEnrolled?: boolean
  mfaLoading?: boolean
  mfaResetting?: boolean
  canResetMfa?: boolean
  onResetMfa?: () => void
}

const PERMISSION_ITEMS: Array<{
  key: keyof UserControlProfile["permissions"]
  name: string
  desc: string
}> = [
  { key: "exportDatabase", name: "Exportar base de datos", desc: "Exportar listado en CSV/Excel." },
  { key: "viewRetrocommissions", name: "Ver retrocomisiones", desc: "Comisiones diferidas del equipo." },
  { key: "contractsView", name: "Lectura de contratos", desc: "Acceso a contratos del canal." },
  { key: "comparatorAccess", name: "Acceso al Comparador", desc: "Simular y cotizar ofertas." },
  { key: "quickSettlement", name: "Gestión rápida de comisiones", desc: "Aprobación instantánea de comisiones." },
]

export function UserControlSheet({
  user,
  managers,
  open,
  saving,
  deleting,
  canDelete,
  currentUserId,
  onClose,
  onChange,
  onSaveRole,
  onTogglePermission,
  onDelete,
  mfaEnrolled = false,
  mfaLoading = false,
  mfaResetting = false,
  canResetMfa = false,
  onResetMfa,
}: UserControlSheetProps) {
  const [enrolled, setEnrolled] = useState(mfaEnrolled)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    setEnrolled(mfaEnrolled)
  }, [mfaEnrolled])

  useEffect(() => {
    if (!open || user.role === "customer") return
    let cancelled = false
    setStatusLoading(true)
    void fetchAdminMfaStatus(user.id).then((result) => {
      if (cancelled) return
      if (result.ok) setEnrolled(result.data.enrolled)
      setStatusLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, user.id, user.role])

  if (!open) return null

  async function handleRoleChange(role: UserControlRole) {
    const managerId =
      role === "comercial" ? user.managerId ?? managers[0]?.id ?? null : null
    onChange({ ...user, role, managerId })
    await onSaveRole(role, managerId)
  }

  async function handleManagerChange(managerId: string) {
    onChange({ ...user, managerId })
    await onSaveRole(user.role, managerId)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-md h-full bg-brand-panel border-l border-brand-border shadow-xl flex flex-col"
        aria-label="Panel de control del usuario"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
            <div>
              <h3 className="text-sm font-bold text-brand-text">Panel de control</h3>
              <p className="text-[10px] font-mono text-brand-subtext">erp_comerciales</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-bg"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="rounded-xl border border-brand-border bg-brand-bg/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center uppercase">
                {user.fullName.substring(0, 2)}
              </div>
              <div>
                <p className="font-bold text-brand-text">{user.fullName}</p>
                <p className="text-[10px] font-mono text-brand-subtext">{user.id}</p>
              </div>
            </div>
            <p className="text-[10px] font-mono text-brand-subtext truncate">{user.email}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext font-bold">
              Rol (Supabase)
            </label>
            <select
              value={user.role}
              disabled={saving}
              onChange={(e) => handleRoleChange(e.target.value as UserControlRole)}
              className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text font-mono font-semibold disabled:opacity-50"
            >
              <option value="comercial">comercial</option>
              <option value="jefe_comercial">jefe_comercial</option>
              <option value="superadmin">superadmin</option>
            </select>
            <p className="text-[10px] text-brand-subtext">
              Al cambiar el rol se guarda en <span className="font-mono">erp_comerciales</span> y afecta RLS Ventas.
            </p>
          </div>

          {user.role === "comercial" && (
            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase text-brand-subtext font-bold">
                Jefe de red
              </label>
              <select
                value={user.managerId ?? ""}
                disabled={saving}
                onChange={(e) => handleManagerChange(e.target.value)}
                className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text disabled:opacity-50"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext font-bold">
              Estado en app
            </label>
            <select
              value={user.status}
              onChange={(e) =>
                onChange({
                  ...user,
                  status: e.target.value as UserControlProfile["status"],
                })
              }
              className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
            >
              <option value="activo">activo</option>
              <option value="suspendido">suspendido</option>
            </select>
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-bg/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-amber-600 font-bold">
                Comisión visible (%)
              </span>
              <span className="text-xs font-mono font-bold text-brand-text">
                {user.commissionPercentage}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={user.commissionPercentage}
              onChange={(e) =>
                onChange({ ...user, commissionPercentage: Number(e.target.value) })
              }
              className="w-full accent-cyan-600"
            />
          </div>

          {user.role !== "customer" ? (
          <div className="rounded-xl border border-brand-border bg-brand-bg/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-xs font-semibold text-brand-text">Autenticador MFA</p>
                  <p className="text-[10px] text-brand-subtext">
                    Login: app o código al correo. Aquí reseteas el TOTP.
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  mfaLoading || statusLoading
                    ? "bg-brand-border text-brand-subtext"
                    : enrolled
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {mfaLoading || statusLoading ? "…" : mfaStatusLabel(enrolled)}
              </span>
            </div>
            {canResetMfa && onResetMfa ? (
              <button
                type="button"
                disabled={mfaResetting || mfaLoading || statusLoading || !enrolled}
                onClick={onResetMfa}
                className="w-full py-2 text-[11px] font-bold rounded-lg border border-brand-border text-brand-text hover:bg-brand-bg disabled:opacity-40"
              >
                {mfaResetting ? "Reseteando…" : "Resetear autenticador"}
              </button>
            ) : (
              <p className="text-[10px] text-brand-subtext">
                No puedes resetear el autenticador de este usuario.
              </p>
            )}
            <p className="text-[10px] text-brand-subtext leading-relaxed">
              Al resetear se cierran sus sesiones. En el próximo login tendrá que escanear un QR nuevo.
            </p>
          </div>
          ) : null}

          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase text-brand-subtext font-bold block border-b border-brand-border pb-2">
              Permisos (app local)
            </span>
            {PERMISSION_ITEMS.map((item) => {
              const isChecked = Boolean(user.permissions[item.key])
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border bg-brand-bg/30"
                >
                  <div className="max-w-[210px]">
                    <span className="text-xs font-semibold text-brand-text block">{item.name}</span>
                    <span className="text-[10px] text-brand-subtext">{item.desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePermission(item.key)}
                    className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                      isChecked ? "bg-cyan-600 justify-end" : "bg-brand-border justify-start"
                    }`}
                    aria-pressed={isChecked}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {canDelete && onDelete && user.id !== currentUserId && (
          <footer className="p-5 border-t border-brand-border shrink-0">
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="w-full py-2.5 text-xs font-bold rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Eliminando…" : "Eliminar usuario"}
            </button>
            <p className="mt-2 text-[10px] text-brand-subtext text-center">
              Borra credenciales Auth y revoca el acceso. Si tiene contratos asociados, se conserva
              el historial sin email ni login.
            </p>
          </footer>
        )}
      </motion.aside>
    </div>
  )
}
