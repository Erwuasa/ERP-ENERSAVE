import type { Dispatch, SetStateAction } from "react"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import { useMisClientesPanel } from "@/pages/erp/clientes/hooks/useMisClientesPanel"
import { ClientesKpiStrip } from "@/pages/erp/clientes/components/ClientesKpiStrip"
import { ClientesPanelToolbar } from "@/pages/erp/clientes/components/ClientesPanelToolbar"
import { ClientesPanelTable } from "@/pages/erp/clientes/components/ClientesPanelTable"
import { ClientesFolderModal } from "@/pages/erp/clientes/components/ClientesFolderModal"
import { ClientesContractsModal } from "@/pages/erp/clientes/components/ClientesContractsModal"
import type { ClientesProfileOption } from "@/pages/erp/clientes/components/clientes-panel-utils"

export interface MisClientesPanelProps {
  clients: Client[]
  setClients: Dispatch<SetStateAction<Client[]>>
  contracts: Contract[]
  activeUserId: string
  activeUserName: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  profiles: ClientesProfileOption[]
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onNavigateToContract: (contract: Contract) => void
}

export function MisClientesPanel(props: MisClientesPanelProps) {
  const { clientesSearchQuery, setClientesSearchQuery, onNavigateToContract } = props
  const vm = useMisClientesPanel(props)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="shrink-0 space-y-3 pb-3">
      <ClientesKpiStrip
        total={vm.filteredCount}
        particulares={vm.kpiParticulares}
        pymes={vm.kpiPymes}
        contratosActivos={vm.kpiContratosActivos}
      />

      <ClientesPanelToolbar
        clientesSearchQuery={clientesSearchQuery}
        setClientesSearchQuery={setClientesSearchQuery}
        onExportCsv={vm.exportCsv}
        tipoFilter={vm.tipoFilter}
        setTipoFilter={vm.setTipoFilter}
        aceptacionFilter={vm.aceptacionFilter}
        setAceptacionFilter={vm.setAceptacionFilter}
        tipoCounts={vm.tipoCounts}
        aceptacionCounts={vm.aceptacionCounts}
      />
      </div>

      <div className="min-h-0 flex-1">
      <ClientesPanelTable
        clients={vm.sorted}
        contracts={vm.contracts}
        sortField={vm.sortField}
        sortDirection={vm.sortDirection}
        onSort={vm.handleSort}
        onOpenFolder={vm.setFolderClientId}
        onOpenContracts={vm.setContractsClientId}
      />
      </div>

      <p className="shrink-0 pt-2 text-[10px] font-mono text-brand-subtext">
        {vm.sorted.length} cliente{vm.sorted.length !== 1 ? "s" : ""}
      </p>

      <input
        ref={vm.fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden"
        onChange={vm.handleFilesSelected}
      />

      {vm.folderClient && (
        <ClientesFolderModal
          client={vm.folderClient}
          fileInputRef={vm.fileInputRef}
          onClose={() => vm.setFolderClientId(null)}
          onRemoveArchivo={vm.removeArchivo}
        />
      )}

      {vm.contractsClient && (
        <ClientesContractsModal
          client={vm.contractsClient}
          contracts={vm.linkedContracts}
          onClose={() => vm.setContractsClientId(null)}
          onSelectContract={(contract) => {
            vm.setContractsClientId(null)
            onNavigateToContract(contract)
          }}
        />
      )}
    </div>
  )
}
