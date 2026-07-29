import { useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, ChevronRight, TrendingUp, Users, Wallet } from "lucide-react"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import { defaultDateRange, type DateRangePickerValue } from "../lib/date-range"
import {
  buildComercialesLiquidacionResumen,
  buildJefesEquipoResumen,
  calcCajaNetaEnerSave,
  calcFacturacionEnerSave,
  calcLiquidacionComerciales,
  calcLiquidacionJefesEquipo,
  calcLiquidacionSuperadmin,
  calcRetrocomisionesTotal,
  filterContractsByDateRange,
  type LiquidacionesConsolidadasView,
  type LiquidacionesProfile,
} from "../lib/liquidaciones-consolidadas"
import { DateRangePicker } from "./ui/DateRangePicker"

interface LiquidacionesConsolidadasSuperadminSectionProps {
  activeRole: "superadmin" | "tramitacion"
  contracts: Contract[]
  settlements: Settlement[]
  profiles: LiquidacionesProfile[]
  formatCurrency: (amount: number) => string
  onViewChange?: (view: LiquidacionesConsolidadasView) => void
}

export function LiquidacionesConsolidadasSuperadminSection({
  activeRole,
  contracts,
  settlements,
  profiles,
  formatCurrency,
  onViewChange,
}: LiquidacionesConsolidadasSuperadminSectionProps) {
  const [view, setView] = useState<LiquidacionesConsolidadasView>("overview")
  const defaultSubViewDateRange = useMemo(() => defaultDateRange(), [])
  const [subViewDateRange, setSubViewDateRange] = useState<DateRangePickerValue>(
    () => defaultSubViewDateRange
  )

  const subContracts = useMemo(
    () => filterContractsByDateRange(contracts, subViewDateRange.from, subViewDateRange.to),
    [contracts, subViewDateRange.from, subViewDateRange.to]
  )

  const facturacionEnerSave = calcFacturacionEnerSave(contracts)
  const liquidacionComerciales = calcLiquidacionComerciales(contracts, profiles)
  const liquidacionJefes = calcLiquidacionJefesEquipo(contracts, profiles)
  const liquidacionSuperadmin = calcLiquidacionSuperadmin(contracts, profiles)
  const retrocomisiones = calcRetrocomisionesTotal(settlements, contracts)
  const cajaNeta = calcCajaNetaEnerSave(
    facturacionEnerSave,
    liquidacionComerciales,
    liquidacionJefes,
    liquidacionSuperadmin,
    retrocomisiones
  )

  const jefesResumen = useMemo(
    () => buildJefesEquipoResumen(subContracts, profiles),
    [subContracts, profiles]
  )
  const comercialesResumen = useMemo(
    () => buildComercialesLiquidacionResumen(subContracts, profiles),
    [subContracts, profiles]
  )

  function navigateTo(next: LiquidacionesConsolidadasView) {
    setView(next)
    onViewChange?.(next)
  }

  function goBack() {
    navigateTo("overview")
  }

  if (view === "jefes_equipo") {
    return (
      <div className="p-6 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-5 shadow-sm animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
            Liquidación Jefes de Equipo
          </button>
          <DateRangePicker
            value={subViewDateRange}
            onChange={setSubViewDateRange}
            defaultValue={defaultSubViewDateRange}
            align="right"
          />
        </div>

        <div className="space-y-4">
          {jefesResumen.length === 0 ? (
            <p className="text-xs text-brand-subtext font-mono">No hay jefes de equipo registrados.</p>
          ) : (
            jefesResumen.map((item) => (
              <div
                key={item.jefe.id}
                className="p-5 bg-brand-panel border border-brand-border rounded-2xl space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text">{item.jefe.fullName}</h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Comisionado {item.jefe.commissionPercentage}%
                    </span>
                  </div>
                  <strong className="text-lg font-bold text-emerald-500 font-mono">
                    {formatCurrency(item.liquidacionTotal)}
                  </strong>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KpiMini
                    label="Contratos propios"
                    value={String(item.contratosPropios)}
                    icon={<Wallet className="w-3.5 h-3.5" />}
                  />
                  <KpiMini
                    label="Contratos del equipo"
                    value={String(item.contratosEquipo)}
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                  />
                  <KpiMini
                    label="Comerciales en equipo"
                    value={String(item.comercialesEnEquipo)}
                    icon={<Users className="w-3.5 h-3.5" />}
                  />
                </div>

                {item.porCompania.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                          <th className="text-left py-2 pr-3">Compañía</th>
                          <th className="text-right py-2 px-2">Contratos</th>
                          <th className="text-right py-2 px-2">Facturación</th>
                          <th className="text-right py-2 pl-2">Liquidación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.porCompania.map((row) => (
                          <tr key={row.compania} className="border-b border-brand-border/60">
                            <td className="py-2 pr-3 text-brand-text">{row.compania}</td>
                            <td className="py-2 px-2 text-right">{row.contratos}</td>
                            <td className="py-2 px-2 text-right text-blue-600 dark:text-cyan-400">
                              {formatCurrency(row.facturacionEnerSave)}
                            </td>
                            <td className="py-2 pl-2 text-right text-emerald-500 font-bold">
                              {formatCurrency(row.liquidacion)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <TeamMembersList jefeId={item.jefe.id} profiles={profiles} />
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (view === "comerciales") {
    return (
      <div className="p-6 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-5 shadow-sm animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-500 uppercase tracking-wider hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
            Liquidación Comerciales
          </button>
          <DateRangePicker
            value={subViewDateRange}
            onChange={setSubViewDateRange}
            defaultValue={defaultSubViewDateRange}
            align="right"
          />
        </div>

        <div className="space-y-4">
          {comercialesResumen.length === 0 ? (
            <p className="text-xs text-brand-subtext font-mono">No hay comerciales registrados.</p>
          ) : (
            comercialesResumen.map((item) => (
              <div
                key={item.comercial.id}
                className="p-5 bg-brand-panel border border-brand-border rounded-2xl space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-brand-text">{item.comercial.fullName}</h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Comisionado {item.comercial.commissionPercentage}%
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-slate-500 uppercase block">A pagar</span>
                    <strong className="text-lg font-bold text-amber-500">
                      {formatCurrency(item.aPagar)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <KpiMini label="Contratos" value={String(item.contratos)} />
                  <KpiMini
                    label="Facturación generada"
                    value={formatCurrency(item.facturacionGenerada)}
                  />
                </div>

                {item.porCompania.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[9px] uppercase text-slate-500 border-b border-brand-border">
                          <th className="text-left py-2 pr-3">Compañía</th>
                          <th className="text-right py-2 px-2">Contratos</th>
                          <th className="text-right py-2 pl-2">A pagar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.porCompania.map((row) => (
                          <tr key={row.compania} className="border-b border-brand-border/60">
                            <td className="py-2 pr-3 text-brand-text">{row.compania}</td>
                            <td className="py-2 px-2 text-right">{row.contratos}</td>
                            <td className="py-2 pl-2 text-right text-amber-500 font-bold">
                              {formatCurrency(row.aPagar)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const isSuperadmin = activeRole === "superadmin"

  return (
    <div className="p-6 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-4 shadow-sm animate-fade-in">
      <div className="flex items-center space-x-2.5">
        <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600">
          <TrendingUp className="w-4 h-4" />
        </span>
        <span className="text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none">
          Liquidaciones EnerSave
        </span>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${isSuperadmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}
      >
        {isSuperadmin && (
          <KpiCard
            label="Facturación EnerSave"
            value={formatCurrency(facturacionEnerSave)}
            valueClassName="text-blue-600 dark:text-cyan-400"
          />
        )}

        <KpiCard
          label="Liquidación Comerciales"
          value={formatCurrency(liquidacionComerciales)}
          valueClassName="text-amber-500"
          onClick={() => navigateTo("comerciales")}
          clickable
        />

        <KpiCard
          label="Liquidación Jefes de Equipo"
          value={formatCurrency(liquidacionJefes)}
          valueClassName="text-emerald-500"
          onClick={() => navigateTo("jefes_equipo")}
          clickable
        />

        <KpiCard
          label="Caja Neta EnerSave"
          value={formatCurrency(cajaNeta)}
          valueClassName="text-indigo-600 dark:text-indigo-300"
          containerClassName="bg-indigo-500/5 border-indigo-500/25"
        />
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  valueClassName,
  containerClassName = "bg-brand-panel border-brand-border",
  onClick,
  clickable = false,
}: {
  label: string
  value: string
  valueClassName: string
  containerClassName?: string
  onClick?: () => void
  clickable?: boolean
}) {
  const Tag = clickable ? "button" : "div"
  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={`p-4 border rounded-xl text-left ${containerClassName} ${
        clickable
          ? "cursor-pointer hover:border-blue-400/40 transition-all group"
          : ""
      }`}
    >
      <span className="text-[9px] text-slate-400 uppercase font-mono block font-semibold">
        {label}
      </span>
      <strong
        className={`text-xl font-bold font-mono tracking-tight block mt-0.5 ${valueClassName}`}
      >
        {value}
      </strong>
      {clickable && (
        <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-mono mt-2 group-hover:text-blue-500">
          Ver detalle
          <ChevronRight className="w-3 h-3" />
        </span>
      )}
    </Tag>
  )
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="p-3 rounded-xl bg-brand-surface/60 border border-brand-border">
      <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono text-slate-500">
        {icon}
        {label}
      </div>
      <strong className="text-sm font-bold text-brand-text font-mono block mt-1">{value}</strong>
    </div>
  )
}

function TeamMembersList({
  jefeId,
  profiles,
}: {
  jefeId: string
  profiles: LiquidacionesProfile[]
}) {
  const members = profiles.filter((p) => p.managerId === jefeId && p.role === "comercial")
  if (members.length === 0) return null

  return (
    <div className="pt-2 border-t border-brand-border space-y-2">
      <span className="text-[9px] font-mono uppercase text-slate-500 block">
        Comerciales del equipo
      </span>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <span
            key={member.id}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-[10px] font-mono"
          >
            <span className="text-brand-text font-semibold">{member.fullName}</span>
            <span className="text-amber-500 font-bold">{member.commissionPercentage}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}
