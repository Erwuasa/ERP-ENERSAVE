import { Building2, CheckCircle, User, Users } from "lucide-react"

type Props = {
  total: number
  particulares: number
  pymes: number
  contratosActivos: number
}

export function ClientesKpiStrip({ total, particulares, pymes, contratosActivos }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Clientes
            </p>
            <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
              {total}
            </p>
          </div>
          <Users className="w-8 h-8 text-blue-500/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-sky-400" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Particulares
            </p>
            <p className="text-2xl font-black font-mono text-sky-500 mt-1">{particulares}</p>
          </div>
          <User className="w-8 h-8 text-sky-400/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel p-5 rounded-2xl border border-amber-400/50 shadow-sm relative overflow-hidden ring-1 ring-amber-400/20">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
        <div className="absolute top-0 right-0 w-full h-1 bg-amber-400/70" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              PYMEs
            </p>
            <p className="text-2xl font-black font-mono text-orange-500 mt-1">{pymes}</p>
          </div>
          <Building2 className="w-8 h-8 text-orange-500/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Contratos activos
            </p>
            <p className="text-2xl font-black font-mono text-emerald-500 mt-1">
              {contratosActivos}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500/80 shrink-0" />
        </div>
      </div>
    </div>
  )
}
