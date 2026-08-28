import { AnimatePresence, motion } from "motion/react"
import { UserPlus, X } from "lucide-react"
import type { UserRole } from "@/types/profile"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

type Props = Pick<
  ErpWorkspaceContext,
  | "profiles"
  | "newUserName"
  | "setNewUserName"
  | "newUserEmail"
  | "setNewUserEmail"
  | "newUserRole"
  | "setNewUserRole"
  | "newUserManager"
  | "setNewUserManager"
  | "isCreateOpen"
  | "setIsCreateOpen"
  | "isCreatingUser"
  | "handleAddNewUser"
>

export function CreateUserModal({
  profiles,
  newUserName,
  setNewUserName,
  newUserEmail,
  setNewUserEmail,
  newUserRole,
  setNewUserRole,
  newUserManager,
  setNewUserManager,
  isCreateOpen,
  setIsCreateOpen,
  isCreatingUser,
  handleAddNewUser,
}: Props) {
  return (
    <AnimatePresence>
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="bg-brand-panel border border-brand-border w-full max-w-md rounded-2xl p-6 relative z-10 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-brand-text">Registrar asesor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewUser} className="space-y-4 text-xs">
              <p className="text-[11px] text-brand-subtext leading-relaxed">
                Crea la invitación en Supabase. El asesor podrá registrarse después con ese email.
              </p>
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="p. ej. Miguel Ángel Soler"
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-brand-text"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">
                  Email de acceso
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="asesor@correo.com"
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-brand-text"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">
                  Rol
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none text-brand-text font-mono font-semibold"
                >
                  <option value="comercial">comercial</option>
                  <option value="jefe_comercial">jefe_comercial</option>
                  <option value="tramitacion">tramitacion</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
              {newUserRole === "comercial" && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">
                    Jefe de red
                  </label>
                  <select
                    value={newUserManager}
                    onChange={(e) => setNewUserManager(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none text-brand-text font-mono"
                  >
                    <option value="">Selecciona jefe</option>
                    {profiles
                      .filter((p) => p.role === "jefe_comercial" || p.role === "superadmin")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isCreatingUser ? "Registrando…" : "Registrar en Supabase"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
