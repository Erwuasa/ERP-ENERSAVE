import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { EnersaveMarkLogin } from "@/components/common/EnersaveMarkLogin"
import { ROUTES } from "@/constants/navigation"

export function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300 font-sans">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <EnersaveMarkLogin className="relative z-10 h-24 w-24 sm:h-28 sm:w-28 mb-6 shrink-0" />

      <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-brand-text font-display">
            Acceso por invitación
          </h1>
        </div>

        <div className="space-y-4 text-sm text-brand-subtext leading-relaxed">
          <p>
            Las cuentas de staff se crean cuando un superadmin te invita. Recibirás un correo con tu
            contraseña temporal y el enlace de acceso.
          </p>
          <p>
            En el primer inicio de sesión deberás elegir tu contraseña definitiva y configurar
            Google Authenticator como <strong className="text-brand-text">ENERSAVE ERP</strong>.
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
    </div>
  )
}
