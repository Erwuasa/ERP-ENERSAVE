import { LIQUIDACIONES_COMPANIA_TABS } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-utils"

type Props = {
  selectedTab: string
  onSelectTab: (tab: string) => void
  counts: Record<string, number>
}

export function CompaniaTabsBar({ selectedTab, onSelectTab, counts }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-1">
      {LIQUIDACIONES_COMPANIA_TABS.map((tab) => {
        const count = counts[tab] ?? 0
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer border ${
              selectedTab === tab
                ? "bg-blue-600 text-white border-blue-600 shadow-sm font-black"
                : "bg-brand-panel border-brand-border text-brand-text hover:border-slate-300 dark:hover:border-white/15"
            }`}
          >
            {tab}{" "}
            {count > 0 && (
              <span className="ml-1 px-1 bg-amber-500/20 text-amber-500 text-[8px] font-bold rounded-full">
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
