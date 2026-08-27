import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, ChevronRight, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react"
import { colors, motion, radius } from "@/constants/styles"
import { isCompleteEmailOtp, isCompleteTotpCode, maskEmail, totpQrImageSrc } from "@/lib/supabase/auth-mfa"

export type MfaPanelKind = "choose" | "challenge" | "enroll" | "email"
type MfaChoice = "totp" | "email"

const choiceButtonClass = [
  "group w-full p-4 text-left flex items-center gap-3",
  colors.surface,
  radius.xl,
  "border border-slate-200 dark:border-slate-800",
  "transition-all",
  motion.transition,
  "hover:border-blue-500 dark:hover:border-cyan-400 hover:bg-blue-500/5 dark:hover:bg-cyan-400/5 hover:shadow-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-cyan-400/40",
  "focus-visible:border-blue-500 dark:focus-visible:border-cyan-400",
  "disabled:opacity-50 disabled:pointer-events-none",
].join(" ")

function ChoiceButton({
  pending,
  loadingLabel,
  icon,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  pending: boolean
  loadingLabel: string
  icon: ReactNode
  title: string
  subtitle: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={pending}
      onClick={onClick}
      className={`${choiceButtonClass} ${
        pending ? "border-blue-500 dark:border-cyan-400 bg-blue-500/5 dark:bg-cyan-400/5" : ""
      }`}
    >
      <span className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
        {pending ? (
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-cyan-400 animate-spin" />
        ) : (
          icon
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-brand-text">
          {pending ? loadingLabel : title}
        </span>
        <span className="block text-[11px] text-brand-subtext">{subtitle}</span>
      </span>
      <ChevronRight
        className={`w-4 h-4 shrink-0 text-brand-subtext transition-transform ${motion.transition} group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-focus-visible:translate-x-1 ${
          pending ? "opacity-0" : ""
        }`}
      />
    </button>
  )
}

export function MfaLoginPanel({
  kind,
  email,
  qrCode,
  secret,
  code,
  onCodeChange,
  onSubmit,
  onCancel,
  onChooseTotp,
  onChooseEmail,
  onResendEmail,
  onBackToChoose,
  loading,
  error,
}: {
  kind: MfaPanelKind
  email?: string
  qrCode?: string
  secret?: string
  code: string
  onCodeChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  onChooseTotp?: () => void
  onChooseEmail?: () => void
  onResendEmail?: () => void
  onBackToChoose?: () => void
  loading: boolean
  error: string | null
}) {
  const isEnroll = kind === "enroll"
  const isEmail = kind === "email"
  const masked = email ? maskEmail(email) : ""
  const [pendingChoice, setPendingChoice] = useState<MfaChoice | null>(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!loading) {
      setPendingChoice(null)
      setResending(false)
    }
  }, [loading])

  if (kind === "choose") {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-lg font-black text-brand-text">Verificación</h2>
          <p className="text-xs text-brand-subtext leading-relaxed">
            Elige cómo quieres confirmar el acceso.
          </p>
        </div>

        {error ? (
          <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
              {error}
            </p>
          </div>
        ) : null}

        <ChoiceButton
          pending={pendingChoice === "totp" && loading}
          loadingLabel="Preparando autenticador…"
          icon={<Smartphone className="w-5 h-5 text-blue-600 dark:text-cyan-400" />}
          title="App autenticadora"
          subtitle="Google Authenticator, Authy u otra"
          disabled={loading}
          onClick={() => {
            setPendingChoice("totp")
            onChooseTotp?.()
          }}
        />

        <ChoiceButton
          pending={pendingChoice === "email" && loading}
          loadingLabel="Generando código de acceso…"
          icon={<Mail className="w-5 h-5 text-blue-600 dark:text-cyan-400" />}
          title="Código al correo"
          subtitle={masked ? `Enviar OTP a ${masked}` : "Te enviamos un código al correo"}
          disabled={loading}
          onClick={() => {
            setPendingChoice("email")
            onChooseEmail?.()
          }}
        />

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full text-xs font-medium text-brand-subtext hover:text-brand-text transition-colors disabled:opacity-50"
        >
          Cancelar e iniciar con otra cuenta
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          {isEmail ? (
            <Mail className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          )}
        </div>
        <h2 className="text-lg font-black text-brand-text">
          {isEnroll ? "Activa el autenticador" : isEmail ? "Código al correo" : "Código de verificación"}
        </h2>
        <p className="text-xs text-brand-subtext leading-relaxed">
          {isEnroll
            ? "Escanea el QR con Google Authenticator, Authy o similar y escribe el código de 6 dígitos."
            : isEmail
              ? `Hemos enviado un código a ${masked}. Escríbelo tal cual (6 u 8 dígitos).`
              : "Introduce el código de 6 dígitos de tu app autenticadora."}
        </p>
      </div>

      {isEnroll && qrCode ? (
        <div className="space-y-3">
          <img
            src={totpQrImageSrc(qrCode)}
            alt="Código QR para el autenticador"
            className="w-44 h-44 mx-auto bg-white p-2 rounded-xl"
          />
          {secret ? (
            <p className="text-center text-[11px] font-mono text-brand-subtext break-all">
              {secret}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
            {error}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
          Código
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          className="w-full px-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-center text-lg font-mono tracking-[0.4em]"
          placeholder={isEmail ? "00000000" : "000000"}
          maxLength={isEmail ? 8 : 6}
        />
      </div>

      <button
        type="submit"
        disabled={loading || (isEmail ? !isCompleteEmailOtp(code) : !isCompleteTotpCode(code))}
        className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer overflow-hidden"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span className="text-sm">{isEnroll ? "Activar y entrar" : "Verificar"}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      {isEmail && onResendEmail ? (
        <button
          type="button"
          onClick={() => {
            setResending(true)
            onResendEmail()
          }}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:underline disabled:opacity-50"
        >
          {resending && loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {resending && loading ? "Generando código…" : "Reenviar código"}
        </button>
      ) : null}

      {onBackToChoose ? (
        <button
          type="button"
          onClick={onBackToChoose}
          disabled={loading}
          className="w-full text-xs font-medium text-brand-subtext hover:text-brand-text transition-colors disabled:opacity-50"
        >
          Elegir otro método
        </button>
      ) : null}

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
