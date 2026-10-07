import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"
import { clientDisplayName, getContractsForClient } from "@/lib/clients"
import {
  formatClientContact,
  getClientProvincia,
  getClientTerminos,
  type ClienteSortField,
  type SortDirection,
} from "@/lib/clientes-panel-filters"
import { clientTypeBadgeClass } from "@/lib/enersave-ui-theme"
import { ClientesQuickActions } from "@/pages/erp/clientes/components/ClientesQuickActions"
import { ClientesSortableHeader } from "@/pages/erp/clientes/components/ClientesSortableHeader"
import { CLIENTES_TD, CLIENTES_TH } from "@/pages/erp/clientes/components/clientes-panel-utils"
import { ClientesTableSkeleton } from "@/components/ui/skeletons/VentasSkeletons"

type Props = {
  clients: Client[]
  /** True while the initial clients fetch is in flight and there's nothing to show yet. */
  loading?: boolean
  contracts: Contract[]
  sortField: ClienteSortField
  sortDirection: SortDirection
  onSort: (field: ClienteSortField) => void
  onOpenFolder: (clientId: string) => void
  onOpenContracts: (clientId: string) => void
  onCreateContract?: (client: Client) => void
}

export function ClientesPanelTable({
  clients,
  loading = false,
  contracts,
  sortField,
  sortDirection,
  onSort,
  onOpenFolder,
  onOpenContracts,
  onCreateContract,
}: Props) {
  if (loading && clients.length === 0) {
    return <ClientesTableSkeleton />
  }

  return (
    <div className="h-full min-h-0 overflow-auto overscroll-contain rounded-2xl border border-brand-border bg-brand-panel shadow-sm">
      <table className="w-full min-w-[980px] table-fixed text-left border-collapse text-xs">
        <colgroup>
          <col className="w-[19%]" />
          <col className="w-[11%]" />
          <col className="w-[92px]" />
          <col className="w-[92px]" />
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[12%]" />
          <col className="w-[80px]" />
          <col className="w-[124px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-brand-surface/90">
          <tr className="text-brand-subtext font-mono border-b border-brand-border">
            <th className={CLIENTES_TH}>
              <ClientesSortableHeader
                label="Cliente"
                field="nombre"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className={CLIENTES_TH}>
              <ClientesSortableHeader
                label="DNI/CIF"
                field="documento"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className={CLIENTES_TH}>Tipo</th>
            <th className={CLIENTES_TH}>
              <ClientesSortableHeader
                label="Alta"
                field="alta"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className={CLIENTES_TH}>Contacto</th>
            <th className={CLIENTES_TH}>Provincia</th>
            <th className={CLIENTES_TH}>Términos</th>
            <th className={`${CLIENTES_TH} text-center pr-2`}>Contratos</th>
            <th className={`${CLIENTES_TH} text-right pl-1`}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const linked = getContractsForClient(client, contracts)
            const provincia = getClientProvincia(client, contracts)
            const terminos = getClientTerminos(client, contracts)
            return (
              <tr
                key={client.id}
                className="border-b border-brand-border/70 hover:bg-brand-surface/50"
              >
                <td className={`${CLIENTES_TD} font-semibold text-brand-text`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{clientDisplayName(client)}</span>
                    {client.source === "at" && (
                      <span className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                        AT
                      </span>
                    )}
                    {client.rgpdAccepted && (
                      <span className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        RGPD
                      </span>
                    )}
                  </div>
                </td>
                <td className={`${CLIENTES_TD} font-mono uppercase text-brand-subtext truncate`}>
                  {client.documento || "—"}
                </td>
                <td className={CLIENTES_TD}>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${clientTypeBadgeClass(
                      client.tipoCliente === "empresa" ? "empresa" : "particular"
                    )}`}
                  >
                    {client.tipoCliente === "empresa" ? "PYME" : "Particular"}
                  </span>
                </td>
                <td className={`${CLIENTES_TD} font-mono tabular-nums text-brand-subtext`}>
                  {client.createdAt.split("-").reverse().join("/")}
                </td>
                <td className={`${CLIENTES_TD} text-brand-text truncate`} title={formatClientContact(client)}>
                  {formatClientContact(client)}
                </td>
                <td className={`${CLIENTES_TD} text-brand-subtext truncate`}>{provincia}</td>
                <td className={`${CLIENTES_TD} text-brand-subtext truncate`} title={terminos}>
                  {terminos}
                </td>
                <td className={`${CLIENTES_TD} text-center pr-3`}>
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center tabular-nums text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {linked.length}
                  </span>
                </td>
                <td className={`${CLIENTES_TD} pl-1 pr-2`}>
                  <ClientesQuickActions
                    client={client}
                    onOpenFolder={() => onOpenFolder(client.id)}
                    onOpenContracts={() => onOpenContracts(client.id)}
                    onCreateContract={onCreateContract}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {clients.length === 0 && (
        <p className="text-center text-xs text-brand-subtext py-10 font-mono">
          No hay clientes que coincidan con los filtros.
        </p>
      )}
    </div>
  )
}
