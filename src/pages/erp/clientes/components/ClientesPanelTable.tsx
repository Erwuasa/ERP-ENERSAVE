import { FilePenLine, FolderOpen } from "lucide-react"
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
import { ClientesSortableHeader } from "@/pages/erp/clientes/components/ClientesSortableHeader"
import { CLIENTES_TD, CLIENTES_TH } from "@/pages/erp/clientes/components/clientes-panel-utils"

type Props = {
  clients: Client[]
  contracts: Contract[]
  sortField: ClienteSortField
  sortDirection: SortDirection
  onSort: (field: ClienteSortField) => void
  onOpenFolder: (clientId: string) => void
  onOpenContracts: (clientId: string) => void
}

export function ClientesPanelTable({
  clients,
  contracts,
  sortField,
  sortDirection,
  onSort,
  onOpenFolder,
  onOpenContracts,
}: Props) {
  return (
    <div className="h-full min-h-0 overflow-auto overscroll-contain rounded-2xl border border-brand-border bg-brand-panel shadow-sm">
      <table className="w-full min-w-[920px] table-fixed text-left border-collapse text-xs">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[88px]" />
          <col className="w-[88px]" />
          <col className="w-[16%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[72px]" />
          <col className="w-[88px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-brand-panel">
          <tr className="text-brand-subtext font-mono">
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
            <th className={`${CLIENTES_TH} text-right`}>Contratos</th>
            <th className={`${CLIENTES_TH} text-right`}>Acciones</th>
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
                    className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ring-1 ring-inset ${
                      client.tipoCliente === "empresa"
                        ? "bg-orange-500/12 text-orange-600 dark:text-orange-400 ring-orange-500/25"
                        : "bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-sky-500/25"
                    }`}
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
                <td className={`${CLIENTES_TD} text-right`}>
                  <span className="inline-flex min-w-[1.5rem] justify-center px-1.5 py-0.5 rounded-full bg-brand-surface font-mono font-bold text-brand-text ring-1 ring-inset ring-brand-border">
                    {linked.length}
                  </span>
                </td>
                <td className={CLIENTES_TD}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenFolder(client.id)}
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                      title="Carpeta de documentos"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenContracts(client.id)}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-cyan-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors cursor-pointer"
                      title="Contratos del cliente"
                    >
                      <FilePenLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
