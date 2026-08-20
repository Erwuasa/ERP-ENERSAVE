import { Fragment, useMemo, useState } from "react"
import { useProspectos } from "../../lib/ventas/hooks/useProspectos"
import {
  useReportingActividad,
  type ReportingProfile,
} from "../../lib/ventas/hooks/useReportingActividad"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import {
  aggregateDescartesByMotivo,
  computeFunnelMetrics,
  filterProspectosForReportingScope,
} from "../../lib/ventas/reporting-ui"
import {
  ReportingFunnelSkeleton,
  ReportingTableSkeleton,
} from "../ui/skeletons/VentasSkeletons"

interface ReportingPageProps {
  actor: VentasActor
  profiles: ReportingProfile[]
}

function FunnelBar({
  label,
  count,
  maxCount,
  conversionPct,
}: {
  label: string
  count: number
  maxCount: number
  conversionPct: number | null
}) {
  const widthPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono uppercase text-brand-subtext gap-2">
        <span className="truncate">{label}</span>
        <span className="shrink-0">
          {count}
          {conversionPct != null ? ` · ${conversionPct}% →` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-brand-bg border border-brand-border overflow-hidden">
        <div
          className="h-full bg-cyan-500 dark:bg-cyan-500 transition-all duration-300"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}

export function ReportingPage({ actor, profiles }: ReportingPageProps) {
  const [periodDays, setPeriodDays] = useState<7 | 30>(7)
  const [selectedComercialId, setSelectedComercialId] = useState<string>("")

  const teamMemberIds = useMemo(
    () =>
      profiles
        .filter((p) => p.managerId === actor.comercialId)
        .map((p) => p.id),
    [profiles, actor.comercialId]
  )

  const { prospectos, loading: prospectosLoading, error: prospectosError } =
    useProspectos(actor)
  const {
    rows: actividadRows,
    loading: actividadLoading,
    error: actividadError,
  } = useReportingActividad(actor, profiles, periodDays)

  const filteredProspectos = useMemo(
    () =>
      filterProspectosForReportingScope(
        prospectos,
        actor,
        teamMemberIds,
        selectedComercialId || null
      ),
    [prospectos, actor, teamMemberIds, selectedComercialId]
  )

  const funnel = useMemo(
    () => computeFunnelMetrics(filteredProspectos),
    [filteredProspectos]
  )
  const descartes = useMemo(
    () => aggregateDescartesByMotivo(filteredProspectos),
    [filteredProspectos]
  )

  const isInitialLoad = prospectosLoading && prospectos.length === 0
  const actividadInitialLoad = actividadLoading && actividadRows.length === 0
  const error = prospectosError ?? actividadError

  const showComercialFilter =
    actor.role === "jefe_comercial" || actor.role === "superadmin"

  const comercialOptions = useMemo(() => {
    if (actor.role === "jefe_comercial") {
      return profiles.filter(
        (p) => p.id === actor.comercialId || p.managerId === actor.comercialId
      )
    }
    if (actor.role === "superadmin") {
      return profiles.filter(
        (p) => p.role === "comercial" || p.role === "jefe_comercial"
      )
    }
    return []
  }, [profiles, actor])

  return (
    <div className="space-y-4 animate-fade-in relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight">
            Reporting
          </h2>
          <p className="text-[10px] font-mono text-brand-subtext uppercase tracking-wider">
            /ventas/reporting
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value) as 7 | 30)}
            className="h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          {showComercialFilter && (
            <select
              value={selectedComercialId}
              onChange={(e) => setSelectedComercialId(e.target.value)}
              className="h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text max-w-[200px]"
            >
              <option value="">Todos los comerciales</option>
              {comercialOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <section
        className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
        aria-label="Embudo de conversión"
      >
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          Embudo de conversión
        </h3>
        {isInitialLoad ? (
          <ReportingFunnelSkeleton stages={funnel.length || 6} />
        ) : (
          <div className="space-y-2">
            {funnel.map((stage) => (
              <Fragment key={stage.fase}>
                <FunnelBar
                  label={stage.label}
                  count={stage.count}
                  maxCount={Math.max(1, ...funnel.map((f) => f.count))}
                  conversionPct={stage.conversionToNextPct}
                />
              </Fragment>
            ))}
          </div>
        )}
      </section>

      <section
        className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
        aria-label="Actividad por comercial"
      >
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          Actividad por comercial
        </h3>
        {actividadInitialLoad ? (
          <ReportingTableSkeleton rows={4} />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[320px]">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-brand-subtext border-b border-brand-border">
                <th className="py-2 pr-4">Comercial</th>
                <th className="py-2 pr-4">Actividades</th>
                <th className="py-2">Tareas completadas</th>
              </tr>
            </thead>
            <tbody>
              {actividadRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-brand-subtext">
                    Sin actividad en el período.
                  </td>
                </tr>
              ) : (
                actividadRows.map((row) => (
                  <tr key={row.comercialId} className="border-b border-brand-border/50">
                    <td className="py-2 pr-4 font-medium">{row.comercialName}</td>
                    <td className="py-2 pr-4">{row.actividadesCount}</td>
                    <td className="py-2">{row.tareasCompletadasCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <section
        className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
        aria-label="Motivos de descarte"
      >
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          Motivos de descarte
        </h3>
        {descartes.length === 0 ? (
          <p className="text-xs text-brand-subtext">Sin descartes en el scope actual.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[280px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-brand-subtext border-b border-brand-border">
                  <th className="py-2 pr-4">Motivo</th>
                  <th className="py-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {descartes.map((d) => (
                  <tr key={d.motivo} className="border-b border-brand-border/50">
                    <td className="py-2 pr-4">{d.label}</td>
                    <td className="py-2">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
