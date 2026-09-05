import {
  CONTRATO_DETALLE_TABS,
  type ContratoDetalleTab,
} from "@/components/contratos/contrato-detalle-types"

interface ContratoDetalleSidebarProps {
  activeTab: ContratoDetalleTab
  onTabChange: (tab: ContratoDetalleTab) => void
}

export function ContratoDetalleSidebar({
  activeTab,
  onTabChange,
}: ContratoDetalleSidebarProps) {
  return (
    <nav
      className="w-52 shrink-0 border-r border-brand-border bg-brand-panel/80 overflow-y-auto py-3 px-2 space-y-0.5"
      aria-label="Secciones del contrato"
    >
      {CONTRATO_DETALLE_TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isActive
                ? "bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30 shadow-sm"
                : "text-brand-subtext hover:text-brand-text hover:bg-brand-bg/80 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
