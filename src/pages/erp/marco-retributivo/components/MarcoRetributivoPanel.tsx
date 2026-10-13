import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ConfirmModal } from "@/components/common/ConfirmModal"
import { MarcoRetributivoEditModal } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoEditModal"
import { MarcoRetributivoTable } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoTable"
import { MarcoRetributivoToolbar } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoToolbar"
import { useMarcoRetributivoPanel } from "@/pages/erp/marco-retributivo/hooks/useMarcoRetributivoPanel"
import { buildMarcoTableScopeKey } from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"

type MarcoRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"

export interface MarcoRetributivoPanelProps {
  activeRole: MarcoRole
  activeUserId: string
  superadminViewMode?: "tramitacion" | "comercial"
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string, logoUrl: string | null) => ReactNode
}

export function MarcoRetributivoPanel({
  activeRole,
  activeUserId,
  superadminViewMode,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
}: MarcoRetributivoPanelProps) {
  const vm = useMarcoRetributivoPanel({ activeRole, activeUserId, superadminViewMode })
  const tableScopeKey = [
    buildMarcoTableScopeKey({
      compania: vm.companiaFilter,
      tipo: vm.tipoFilter,
      segmento: vm.segmentoFilter,
      peaje: vm.peajeFilter,
    }),
    vm.page,
    vm.search,
  ].join("|")
  const pageSize = vm.pageMode === "companies" ? 4 : 12
  const rangeStart = vm.page * pageSize + (vm.pageMode === "companies" ? (vm.companyCount > 0 ? 1 : 0) : vm.tariffTotal > 0 ? 1 : 0)
  const rangeEnd =
    vm.pageMode === "companies"
      ? Math.min(vm.companyCount, (vm.page + 1) * pageSize)
      : Math.min(vm.tariffTotal, (vm.page + 1) * pageSize)
  const rangeTotal = vm.pageMode === "companies" ? vm.companyCount : vm.tariffTotal

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-panel p-3 sm:p-4 shadow-sm dark:shadow-none">
        <div className="shrink-0 space-y-2.5 pb-2.5">
          <MarcoRetributivoToolbar
            supabaseConfigured={vm.supabaseConfigured}
            canEdit={vm.canEdit}
            tipoFilter={vm.tipoFilter}
            setTipoFilter={vm.setTipoFilter}
            segmentoFilter={vm.segmentoFilter}
            setSegmentoFilter={vm.setSegmentoFilter}
            onCreate={vm.openCreateModal}
            canDedup={vm.canEditComision && vm.supabaseConfigured}
            deduping={vm.deduping}
            onDedupDuplicates={() => void vm.runMarcoDedup()}
            companiaFilter={vm.companiaFilter}
            setCompaniaFilter={vm.setCompaniaFilter}
            companyTabs={vm.companyTabs}
            countsByCompania={vm.countsByCompania}
            peajeOptions={vm.peajeOptions}
            peajeFilter={vm.peajeFilter}
            setPeajeFilter={vm.setPeajeFilter}
            search={vm.search}
            setSearch={vm.setSearch}
          />
        </div>

        <div className="min-h-0 flex-1">
          <MarcoRetributivoTable
            key={tableScopeKey}
            loading={vm.loading && vm.filteredRows.length === 0}
            filteredRows={vm.filteredRows}
            canEdit={vm.canEdit}
            commissionPercentage={commissionPercentage}
            formatCurrency={formatCurrency}
            renderCompaniaLogo={renderCompaniaLogo}
            onOpenEntry={vm.openEntryModal}
            onDeactivate={vm.requestDeactivate}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-[10px] font-mono text-brand-subtext">
            {vm.pageMode === "companies"
              ? `Compañías ${rangeStart}–${rangeEnd} de ${rangeTotal}. Primeras 6 tarifas de cada una.`
              : `Tarifas ${rangeStart}–${rangeEnd} de ${rangeTotal}.`}
            {vm.loading ? " Cargando…" : ""}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => vm.goToPage(vm.page - 1)}
              disabled={vm.page <= 0 || vm.loading}
              aria-label="Página anterior"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-brand-border bg-brand-surface px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-text transition-colors duration-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Anterior
            </button>
            <span className="px-1 text-[10px] font-mono text-brand-subtext">
              {vm.page + 1} / {vm.pageCount}
            </span>
            <button
              type="button"
              onClick={() => vm.goToPage(vm.page + 1)}
              disabled={vm.page + 1 >= vm.pageCount || vm.loading}
              aria-label="Página siguiente"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-brand-border bg-brand-surface px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-text transition-colors duration-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={vm.pendingDeactivate != null}
        title="Desactivar entrada"
        description={
          vm.pendingDeactivate ? (
            <>
              ¿Desactivar{" "}
              <strong className="text-brand-text">{vm.pendingDeactivate.tarifa}</strong> de{" "}
              {vm.pendingDeactivate.compania}? Dejará de aparecer en el marco retributivo.
            </>
          ) : (
            "¿Desactivar esta entrada del marco retributivo?"
          )
        }
        confirmLabel="Desactivar"
        loading={vm.deactivating}
        loadingLabel="Desactivando…"
        onConfirm={() => {
          void vm.confirmDeactivate()
        }}
        onCancel={vm.cancelDeactivate}
      />

      <MarcoRetributivoEditModal
        open={vm.modalOpen}
        entry={vm.modalEntry}
        canEdit={vm.canEdit}
        canEditComision={vm.canEditComision}
        isCreateMode={vm.isCreateMode}
        allEntries={vm.rows}
        marcoCompaniaLabels={vm.marcoCompaniaLabels}
        commissionPercentage={commissionPercentage}
        formatCurrency={formatCurrency}
        onClose={vm.closeModal}
        onSave={vm.handleSave}
        onCreate={vm.handleCreate}
      />
    </div>
  )
}
