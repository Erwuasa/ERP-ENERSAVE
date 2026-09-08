import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { AlertCircle, ChevronRight, Eye, EyeOff, Lock, User } from "lucide-react"
import { EnersaveMarkLogin } from "@/components/common/EnersaveMarkLogin"
import { MfaLoginPanel } from "@/components/auth/MfaLoginPanel"
import { ChangePasswordPanel } from "@/components/auth/ChangePasswordPanel"
import { getDefaultAppPath } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
import { normalizeTotpCode } from "@/lib/supabase/auth-mfa"
import { staffLoginNeedsOnboardingHint } from "@/lib/supabase/staff-login-hint"

export function LoginPage() {
  const {
    isLoggedIn,
    isBootstrapping,
    activeUser,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginLoading,
    loginError,
    passwordChangePending,
    mfaPending,
    triggerLogin,
    submitPasswordChange,
    submitMfa,
    cancelLoginFlow,
  } = useAuth()
  const [mfaCode, setMfaCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showFirstAccessHint, setShowFirstAccessHint] = useState(false)

  useEffect(() => {
    const email = loginEmail.trim().toLowerCase()
    if (!email.includes("@")) {
      setShowFirstAccessHint(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void staffLoginNeedsOnboardingHint(email).then((needsHint) => {
        if (!cancelled) setShowFirstAccessHint(needsHint)
      })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [loginEmail])

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLoggedIn) {
    return <Navigate to={getDefaultAppPath(activeUser.role)} replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300 font-sans">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
        <EnersaveMarkLogin className="mx-auto" />

        {passwordChangePending ? (
          <ChangePasswordPanel
            onSubmit={(newPassword, confirmPassword) => {
              void submitPasswordChange(newPassword, confirmPassword)
            }}
            onCancel={() => {
              void cancelLoginFlow()
            }}
            loading={loginLoading}
            error={loginError}
          />
        ) : mfaPending ? (
          <MfaLoginPanel
            kind={mfaPending.kind}
            qrCode={mfaPending.kind === "enroll" ? mfaPending.qrCode : undefined}
            secret={mfaPending.kind === "enroll" ? mfaPending.secret : undefined}
            code={mfaCode}
            onCodeChange={(value) => setMfaCode(normalizeTotpCode(value))}
            onSubmit={() => {
              void submitMfa(mfaCode)
            }}
            onCancel={() => {
              setMfaCode("")
              void cancelLoginFlow()
            }}
            loading={loginLoading}
            error={loginError}
          />
        ) : (
          <>
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
                  {loginError}
                </p>
              </div>
            )}

            <form onSubmit={triggerLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-sans uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"
                    placeholder="ejemplo@enersave.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-sans uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer mt-6"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-sm">Continuar</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {showFirstAccessHint ? (
              <p className="text-center text-xs text-brand-subtext">
                Usa la contraseña temporal del correo en tu primer acceso.
              </p>
            ) : (
              <p className="text-center text-xs text-brand-subtext">
                El acceso es por invitación de EnerSave.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
