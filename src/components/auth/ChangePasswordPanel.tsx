import { useState } from "react"
import { AlertCircle, ChevronRight, Eye, EyeOff, Lock, Loader2 } from "lucide-react"
import { STAFF_PASSWORD_MIN_LENGTH } from "@/lib/auth-password-change"

interface ChangePasswordPanelProps {
  onSubmit: (newPassword: string, confirmPassword: string) => void
  onCancel: () => void
  loading: boolean
  error: string | null
}

export function ChangePasswordPanel({
  onSubmit,
  onCancel,
  loading,
  error,
}: ChangePasswordPanelProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const inputClass =
    "w-full pl-10 pr-11 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-sm text-brand-text transition-all font-medium"

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(newPassword, confirmPassword)
      }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
        </div>
        <h2 className="text-lg font-black text-brand-text">Nueva contraseña</h2>
        <p className="text-xs text-brand-subtext leading-relaxed">
          Has entrado con una contraseña temporal. Elige la contraseña definitiva de tu cuenta.
        </p>
      </div>

      {error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">{error}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Nueva contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type={showNew ? "text" : "password"}
            required
            minLength={STAFF_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
            placeholder={`Mínimo ${STAFF_PASSWORD_MIN_LENGTH} caracteres`}
          />
          <button
            type="button"
            onClick={() => setShowNew((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Repetir contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type={showConfirm ? "text" : "password"}
            required
            minLength={STAFF_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
            placeholder="Repite la contraseña"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span className="text-sm">Guardar y continuar</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full text-xs font-medium text-brand-subtext hover:text-brand-text transition-colors disabled:opacity-50"
      >
        Cancelar e iniciar con otra cuenta
      </button>
    </form>
  )
}
