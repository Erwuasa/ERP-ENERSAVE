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
      className="w-52 shrink-0 space-y-0.5 self-start border-r border-brand-border bg-brand-panel/95 px-2 py-3"
      aria-label="Secciones del contrato"
    >
      {CONTRATO_DETALLE_TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
              isActive
                ? "border-teal-500/30 bg-teal-500/15 text-teal-800 shadow-sm dark:text-teal-200"
                : "border-transparent text-brand-subtext hover:bg-brand-bg/80 hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
