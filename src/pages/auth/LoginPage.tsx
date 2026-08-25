import { useState } from "react"
import { Navigate, Link } from "react-router-dom"
import { AlertCircle, ChevronRight, Lock, User } from "lucide-react"
import { EnersaveLogo } from "@/components/common/EnersaveLogo"
import { MfaLoginPanel } from "@/components/auth/MfaLoginPanel"
import { getDefaultAppPath, ROUTES } from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
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
  } = useAuth()
  const [mfaCode, setMfaCode] = useState("")

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
        <div className="text-center space-y-4">
          <EnersaveLogo className="h-20 w-20 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-brand-text font-sans">
              ERP ENERSAVE
            </h1>
            <p className="text-xs text-brand-subtext font-medium uppercase font-mono tracking-widest">
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
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
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
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer overflow-hidden mt-6"
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
          ¿No tienes cuenta?{" "}
          <Link to={ROUTES.register} className="font-bold text-blue-600 dark:text-cyan-400 hover:underline">
            Regístrate
          </Link>
        </p>
          </>
        )}
      </div>
    </div>
  )
}
