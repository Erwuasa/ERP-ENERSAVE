import { Building2, CheckCircle, User, Users } from "lucide-react"

type Props = {
  total: number
  particulares: number
  pymes: number
  contratosActivos: number
}

export function ClientesKpiStrip({ total, particulares, pymes, contratosActivos }: Props) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      <div className="bg-brand-panel px-3 py-2.5 rounded-xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Clientes
            </p>
            <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {total}
            </p>
          </div>
          <Users className="w-6 h-6 text-blue-500/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel px-3 py-2.5 rounded-xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-sky-400" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Particulares
            </p>
            <p className="text-xl font-black font-mono text-sky-500 mt-0.5">{particulares}</p>
          </div>
          <User className="w-6 h-6 text-sky-400/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel px-3 py-2.5 rounded-xl border border-amber-400/50 shadow-sm relative overflow-hidden ring-1 ring-amber-400/20">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              PYMEs
            </p>
            <p className="text-xl font-black font-mono text-orange-500 mt-0.5">{pymes}</p>
          </div>
          <Building2 className="w-6 h-6 text-orange-500/80 shrink-0" />
        </div>
      </div>

      <div className="bg-brand-panel px-3 py-2.5 rounded-xl border border-brand-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Contratos activos
            </p>
            <p className="text-xl font-black font-mono text-emerald-500 mt-0.5">
              {contratosActivos}
            </p>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-500/80 shrink-0" />
        </div>
      </div>
    </div>
  )
}
