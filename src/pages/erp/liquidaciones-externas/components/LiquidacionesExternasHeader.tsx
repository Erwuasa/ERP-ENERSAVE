import { Search, WalletCards } from "lucide-react"

type Props = {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function LiquidacionesExternasHeader({ searchQuery, onSearchChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
      <div className="flex items-center space-x-2">
        <WalletCards className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
          Consolidación de Comisiones
        </span>
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="w-3.5 h-3.5 text-brand-subtext absolute top-3 left-3" />
        <input
          type="text"
          placeholder="Buscar liquidación por cliente o cups..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute top-2.5 right-2 text-slate-400 hover:text-brand-text text-xs p-0.5"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
