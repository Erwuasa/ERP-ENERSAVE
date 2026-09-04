import { useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router-dom"
import { AlertCircle, ChevronRight, Lock, User, UserPlus } from "lucide-react"
import { EnersaveLogo } from "@/components/common/EnersaveLogo"
import { ROUTES } from "@/constants/navigation"
import { registerSupabaseAccount } from "@/lib/supabase/auth-session"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

const inputClassName =
  "w-full pl-10 pr-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"

export function RegisterPage() {
  const { isLoggedIn, isBootstrapping } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLoggedIn) {
    return <Navigate to={ROUTES.erp.dashboard} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!fullName.trim()) {
      setError("Indica tu nombre completo.")
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Introduce un correo electrónico válido.")
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado. Añade SUPABASE_URL y SUPABASE_ANON_KEY.")
      return
    }

    setLoading(true)
    const result = await registerSupabaseAccount({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    })
    setLoading(false)

    if (result.ok === false) {
      setError(result.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
        <div className="text-center space-y-4">
          <EnersaveLogo className="h-20 w-20 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-brand-text font-sans">
              Crear cuenta
            </h1>
            <p className="text-xs text-brand-subtext font-medium uppercase font-mono tracking-widest">
              ERP ENERSAVE
            </p>
          </div>
          <p className="text-xs text-brand-subtext leading-relaxed">
            Solo puedes registrarte si un administrador te ha invitado previamente en Usuarios.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
              {error}
            </p>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-normal font-medium">
                Cuenta creada correctamente. Ya puedes iniciar sesión con tu email y contraseña.
              </p>
            </div>
            <Link
              to={ROUTES.login}
              className="flex w-full items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
            >
              Ir a iniciar sesión
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                Nombre completo
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClassName}
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="tu@enersave.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                Repetir contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer overflow-hidden mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Registrarme</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        {!success && (
          <p className="text-center text-xs text-brand-subtext">
            ¿Ya tienes cuenta?{" "}
            <Link to={ROUTES.login} className="font-bold text-blue-600 dark:text-cyan-400 hover:underline">
              Inicia sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
