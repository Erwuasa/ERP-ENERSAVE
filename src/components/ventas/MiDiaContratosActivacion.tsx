import { FileCheck } from "lucide-react"
import { getContractEstadoBadgeClass } from "../../lib/contract-estado"
import type { ContratoActivacionRow } from "../../lib/ventas/mi-dia-cockpit"
import { ContratosTableSkeleton } from "../ui/skeletons/VentasSkeletons"
import { MiDiaCard } from "./MiDiaCard"
import { MI_DIA_SECTION_THEME } from "./mi-dia-theme"

interface MiDiaContratosActivacionProps {
  rows: ContratoActivacionRow[]
  loading?: boolean
}

export function MiDiaContratosActivacion({ rows, loading }: MiDiaContratosActivacionProps) {
  const theme = MI_DIA_SECTION_THEME.activacion

  return (
    <MiDiaCard
      icon={FileCheck}
      title="Activación"
      badge={rows.length > 0 ? rows.length : undefined}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass={theme.borderClass}
      headerTooltip={theme.tooltip}
      noPadding
    >
      {loading ? (
        <ContratosTableSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <p className="text-xs text-brand-subtext px-3 py-6 text-center">—</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-brand-border/40 text-[10px] font-mono uppercase text-brand-subtext">
                <th className="px-3 py-2 font-semibold">Cliente</th>
                <th className="px-2 py-2 font-semibold hidden sm:table-cell">CUPS</th>
                <th className="px-2 py-2 font-semibold text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-brand-bg/50 transition-colors"
                >
                  <td className="px-3 py-2 font-medium text-brand-text truncate max-w-[140px]">
                    {row.cliente}
                  </td>
                  <td className="px-2 py-2 font-mono text-brand-subtext hidden sm:table-cell truncate max-w-[120px]">
                    {row.cups}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span
                      className={`inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${getContractEstadoBadgeClass(row.estadoRaw)}`}
                    >
                      {row.estadoErp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MiDiaCard>
  )
}
