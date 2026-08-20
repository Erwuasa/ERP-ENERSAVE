import { Search } from "lucide-react"

type CanalItem = { id: string; nombre: string; importe: number }

type Props = {
  canalSearch: string
  setCanalSearch: (value: string) => void
  filteredPendientes: CanalItem[]
  filteredLiquidaciones: CanalItem[]
  selectedContraparte: string | null
  setSelectedContraparte: (id: string | null) => void
  formatCurrency: (val: number) => string
}

export function CashflowCanalSections({
  canalSearch,
  setCanalSearch,
  filteredPendientes,
  filteredLiquidaciones,
  selectedContraparte,
  setSelectedContraparte,
  formatCurrency,
}: Props) {
  return (
    <>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext" />
        <input
          type="search"
          value={canalSearch}
          onChange={(e) => setCanalSearch(e.target.value)}
          placeholder="Buscar canal..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-brand-panel border border-brand-border rounded-xl text-xs font-mono text-brand-text placeholder:text-brand-subtext focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CanalList
          title="Pendientes por Canal"
          items={filteredPendientes}
          emptyMessage="No hay importes pendientes de liquidar."
          formatCurrency={formatCurrency}
          selectedId={selectedContraparte}
          onSelect={setSelectedContraparte}
          amountClass="text-orange-500"
        />
        <CanalList
          title="Liquidaciones Consolidadas"
          items={filteredLiquidaciones}
          emptyMessage="No hay liquidaciones consolidadas."
          formatCurrency={formatCurrency}
          amountClass="text-emerald-500"
        />
      </div>

      <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
          Selecciona una contraparte
        </h3>
        {!selectedContraparte ? (
          <p className="text-xs text-brand-subtext italic py-4">
            Haz clic en una contraparte para ver sus devengos pendientes.
          </p>
        ) : (
          <p className="text-xs text-brand-subtext py-4">
            Devengos pendientes de{" "}
            <span className="font-semibold text-brand-text not-italic">
              {filteredPendientes.find((p) => p.id === selectedContraparte)?.nombre}
            </span>
            .
          </p>
        )}
      </section>
    </>
  )
}

function CanalList({
  title,
  items,
  emptyMessage,
  formatCurrency,
  selectedId,
  onSelect,
  amountClass = "text-emerald-500",
}: {
  title: string
  items: CanalItem[]
  emptyMessage: string
  formatCurrency: (val: number) => string
  selectedId?: string | null
  onSelect?: (id: string) => void
  amountClass?: string
}) {
  return (
    <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono">{title}</h3>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-surface text-[10px] font-mono font-bold text-brand-subtext">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-brand-subtext italic py-6 text-center">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedId === item.id
                      ? "border-cyan-500 bg-cyan-500/5"
                      : "border-brand-border hover:bg-slate-50 dark:hover:bg-brand-surface/50"
                  }`}
                >
                  <RowContent item={item} formatCurrency={formatCurrency} amountClass={amountClass} />
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-brand-border">
                  <RowContent item={item} formatCurrency={formatCurrency} amountClass={amountClass} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RowContent({
  item,
  formatCurrency,
  amountClass,
}: {
  item: CanalItem
  formatCurrency: (val: number) => string
  amountClass: string
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-xs font-semibold truncate">{item.nombre}</span>
      <span className={`text-xs font-mono font-bold shrink-0 ${amountClass}`}>
        {formatCurrency(item.importe)}
      </span>
    </div>
  )
}
