import { useEffect, useRef, useState } from "react"
import { Navigate } from "react-router-dom"
import { AlertCircle, ChevronRight, Eye, EyeOff, Lock, User, Zap } from "lucide-react"
import { EnersaveLogo } from "@/components/common/EnersaveLogo"
import { MfaLoginPanel } from "@/components/auth/MfaLoginPanel"
import { getDefaultAppPath } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
import { DEV_SANDBOX_SUPERADMIN_EMAIL } from "@/lib/dev-sandbox-login"
import { normalizeTotpCode } from "@/lib/supabase/auth-mfa"

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
    mfaPending,
    triggerLogin,
    submitMfa,
    chooseMfaMethod,
    resendEmailOtp,
    backToMfaChoose,
    cancelMfa,
    devSandboxQuickLogin,
    isDevSandboxQuickLoginEnabled,
  } = useAuth()
  const [mfaCode, setMfaCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const devAutoLoginAttempted = useRef(false)

  useEffect(() => {
    if (!isDevSandboxQuickLoginEnabled) return
    if (isBootstrapping || isLoggedIn || mfaPending || devAutoLoginAttempted.current) return
    devAutoLoginAttempted.current = true
    void devSandboxQuickLogin()
  }, [
    isDevSandboxQuickLoginEnabled,
    isBootstrapping,
    isLoggedIn,
    mfaPending,
    devSandboxQuickLogin,
  ])

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300 font-sans">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
        <div className="text-center space-y-4">
          <EnersaveLogo className="h-20 w-20 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-brand-text font-display">
              ERP ENERSAVE
            </h1>
            <p className="text-xs text-brand-subtext font-medium uppercase font-sans tracking-widest">
              PLATFORM CORE
            </p>
          </div>
        </div>

        {mfaPending ? (
          <MfaLoginPanel
            kind={mfaPending.kind}
            email={mfaPending.email}
            qrCode={mfaPending.kind === "enroll" ? mfaPending.qrCode : undefined}
            secret={mfaPending.kind === "enroll" ? mfaPending.secret : undefined}
            code={mfaCode}
            onCodeChange={(value) => setMfaCode(normalizeTotpCode(value))}
            onSubmit={() => {
              void submitMfa(mfaCode)
            }}
            onChooseTotp={() => {
              setMfaCode("")
              void chooseMfaMethod("totp")
            }}
            onChooseEmail={() => {
              setMfaCode("")
              void chooseMfaMethod("email")
            }}
            onResendEmail={() => {
              void resendEmailOtp()
            }}
            onBackToChoose={() => {
              setMfaCode("")
              void backToMfaChoose()
            }}
            onCancel={() => {
              setMfaCode("")
              void cancelMfa()
            }}
            loading={loginLoading}
            error={loginError}
          />
        ) : isDevSandboxQuickLoginEnabled ? (
          <div className="space-y-5">
            {loginError ? (
              <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
                  {loginError}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-5 space-y-4">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                <Zap className="w-4 h-4 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-wider">Sandbox dev</p>
              </div>
              <p className="text-sm text-brand-text leading-relaxed">
                Entrada automática como superadmin sin contraseña ni OTP.
              </p>
              <p className="text-[11px] font-mono text-brand-subtext break-all">
                {DEV_SANDBOX_SUPERADMIN_EMAIL}
              </p>
              <button
                type="button"
                disabled={loginLoading}
                onClick={() => void devSandboxQuickLogin()}
                className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-sm">Entrar al ERP</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>
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
                    <span className="text-sm">Entrar al ERP</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-brand-subtext">
              El acceso es por invitación de EnerSave.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
