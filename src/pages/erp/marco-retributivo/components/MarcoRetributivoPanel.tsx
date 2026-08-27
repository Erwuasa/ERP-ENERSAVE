import type { ReactNode } from "react"
import { MarcoRetributivoEditModal } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoEditModal"
import { MarcoRetributivoTable } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoTable"
import { MarcoRetributivoToolbar } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoToolbar"
import { useMarcoRetributivoPanel } from "@/pages/erp/marco-retributivo/hooks/useMarcoRetributivoPanel"

type MarcoRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"

export interface MarcoRetributivoPanelProps {
  activeRole: MarcoRole
  activeUserId: string
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  /** Solo superadmin puede crear/editar entradas del marco */
  canEditMarco?: boolean
}

export function MarcoRetributivoPanel({
  activeRole,
  activeUserId,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
}: MarcoRetributivoPanelProps) {
  const vm = useMarcoRetributivoPanel({ activeRole, activeUserId })

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-5 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <MarcoRetributivoToolbar
          supabaseConfigured={vm.supabaseConfigured}
          canEdit={vm.canEdit}
          tipoFilter={vm.tipoFilter}
          setTipoFilter={vm.setTipoFilter}
          onCreate={vm.openCreateModal}
          companiaFilter={vm.companiaFilter}
          setCompaniaFilter={vm.setCompaniaFilter}
          companyTabs={vm.companyTabs}
          countsByCompania={vm.countsByCompania}
          peajeOptions={vm.peajeOptions}
          peajeFilter={vm.peajeFilter}
          setPeajeFilter={vm.setPeajeFilter}
        />

        <MarcoRetributivoTable
          loading={vm.loading}
          filteredRows={vm.filteredRows}
          showComisionEnersave={vm.showComisionEnersave}
          canEdit={vm.canEdit}
          commissionPercentage={commissionPercentage}
          formatCurrency={formatCurrency}
          renderCompaniaLogo={renderCompaniaLogo}
          onOpenEntry={vm.openEntryModal}
          onDeactivate={vm.handleDeactivate}
        />

        <p className="text-[9px] font-mono text-slate-400 text-right">
          {vm.filteredRows.length} tarifa{vm.filteredRows.length !== 1 ? "s" : ""} ·{" "}
          {vm.loading ? "…" : "actualizado desde Supabase"}
        </p>
      </div>

      <MarcoRetributivoEditModal
        open={vm.modalOpen}
        entry={vm.modalEntry}
        canEdit={vm.canEdit}
        isCreateMode={vm.isCreateMode}
        allEntries={vm.rows}
        onClose={vm.closeModal}
        onSave={vm.handleSave}
        onCreate={vm.handleCreate}
      />
    </div>
  )
}
