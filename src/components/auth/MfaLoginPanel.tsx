import { AlertCircle, ChevronRight, Loader2, ShieldCheck } from "lucide-react"
import { isCompleteTotpCode, totpQrImageSrc } from "@/lib/supabase/auth-mfa"
import { TotpCodeInput } from "@/components/auth/TotpCodeInput"

export type MfaPanelKind = "challenge" | "enroll"

export function MfaLoginPanel({
  kind,
  qrCode,
  secret,
  code,
  onCodeChange,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  kind: MfaPanelKind
  qrCode?: string
  secret?: string
  code: string
  onCodeChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}) {
  const isEnroll = kind === "enroll"

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
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
        </div>
        <h2 className="text-lg font-black text-brand-text">
          {isEnroll ? "Configura Google Authenticator" : "Verificación en dos pasos"}
        </h2>
        <p className="text-xs text-brand-subtext leading-relaxed">
          {isEnroll
            ? 'Escanea el QR con Google Authenticator. La entrada se guardará como "ENERSAVE ERP".'
            : "Introduce el código de 6 dígitos de tu app Google Authenticator."}
        </p>
      </div>

      {isEnroll && qrCode ? (
        <div className="space-y-3">
          <img
            src={totpQrImageSrc(qrCode)}
            alt="Código QR para Google Authenticator"
            className="w-44 h-44 mx-auto bg-white p-2 rounded-xl"
          />
          {secret ? (
            <p className="text-center text-[11px] font-mono text-brand-subtext break-all">{secret}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">{error}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-center text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
          Código de 6 dígitos
        </label>
        <TotpCodeInput value={code} onChange={onCodeChange} disabled={loading} />
      </div>

      <button
        type="submit"
        disabled={loading || !isCompleteTotpCode(code)}
        className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer overflow-hidden"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span className="text-sm">{isEnroll ? "Activar y entrar" : "Verificar y entrar"}</span>
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
