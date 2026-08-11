import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowRight,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Flame,
  Lightbulb,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import {
  countProductosByCompania,
  filterProductos,
  formatPrecioEnergia,
  formatPrecioPotencia,
  listCompaniasFromProductos,
  marcoRowToProducto,
  PRODUCTO_PEAJE_OPTIONS,
  PRODUCTO_TIPO_CLIENTE_OPTIONS,
  type ProductoPeajeFilter,
  type ProductoSuministroTab,
  type ProductoTarifa,
  type ProductoTipoClienteFilter,
} from "../lib/productos-catalog"
import { isSupabaseConfigured } from "../lib/supabase/client"
import {
  listMarcoRetributivo,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "../lib/supabase/marco-retributivo"
import { canEditMarcoRetributivo } from "../lib/marco-retributivo-permissions"

interface ProductosPanelProps {
  title?: string
  subtitle?: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  canEditMarco?: boolean
  onNavigateContratos: () => void
  onCreateContract: (product: ProductoTarifa) => void
  renderCompaniaLogo?: (brandName: string) => ReactNode
}

function SuministroIcon({ tipo }: { tipo: ProductoSuministroTab | "luz" | "gas" }) {
  if (tipo === "gas") return <Flame className="h-3 w-3" aria-hidden />
  if (tipo === "telefonia") return <Phone className="h-3 w-3" aria-hidden />
  return <Zap className="h-3 w-3" aria-hidden />
}

function ProductoCard({
  product,
  onCreateContract,
  onOpenDetail,
}: {
  product: ProductoTarifa
  onCreateContract: (product: ProductoTarifa) => void
  onOpenDetail: (product: ProductoTarifa) => void
}) {
  const energiaRows = ([1, 2, 3, 4, 5, 6] as const)
    .map((n) => {
      const val = product.precios.energia[`p${n}`]
      return val != null ? { label: `Energía P${n}`, value: formatPrecioEnergia(val) } : null
    })
    .filter(Boolean) as { label: string; value: string }[]

  const potenciaRows = ([1, 2, 3, 4, 5, 6] as const)
    .map((n) => {
      const val = product.precios.potencia[`p${n}`]
      return val != null ? { label: `Potencia P${n}`, value: formatPrecioPotencia(val) } : null
    })
    .filter(Boolean) as { label: string; value: string }[]

  const pricingRows = [...energiaRows.slice(0, 3), ...potenciaRows.slice(0, 2)]

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenDetail(product)
        }
      }}
      className="bg-brand-panel border border-brand-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:border-emerald-500/35 transition-colors duration-200 h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide truncate">
          {product.compania}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
              product.tipo === "luz"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
            }`}
          >
            <SuministroIcon tipo={product.tipo} />
            {product.tipo}
          </span>
          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-500/10 text-brand-subtext border border-brand-border uppercase">
            {product.peaje}
          </span>
        </div>
      </div>

      <h4 className="text-sm font-bold text-brand-text leading-snug line-clamp-2">{product.tarifa}</h4>

      <span className="inline-flex self-start px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
        {product.tipoClienteLabel}
      </span>

      <ul className="space-y-1.5 text-[10px] font-mono text-brand-subtext flex-1 min-h-[88px]">
        {pricingRows.length > 0 ? (
          pricingRows.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span>{row.label}</span>
              <span className="text-brand-text tabular-nums shrink-0">{row.value}</span>
            </li>
          ))
        ) : (
          <li className="text-center py-4 text-brand-subtext">Precios no disponibles</li>
        )}
      </ul>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onCreateContract(product)
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Crear contrato
        <ChevronRight className="h-3.5 w-3.5 opacity-80" />
      </button>
    </article>
  )
}

export function ProductosPanel({
  title = "Tarifas",
  subtitle = "Catálogo de tarifas activas por comercializadora — crea contratos desde aquí.",
  activeRole,
  activeUserId,
  canEditMarco: canEditMarcoProp,
  onNavigateContratos,
  onCreateContract,
}: ProductosPanelProps) {
  const [loading, setLoading] = useState(true)
  const [marcoRows, setMarcoRows] = useState<MarcoRetributivoRow[]>([])
  const [products, setProducts] = useState<ProductoTarifa[]>([])
  const [suministro, setSuministro] = useState<ProductoSuministroTab>("luz")
  const [compania, setCompania] = useState("Todas")
  const [tipoCliente, setTipoCliente] = useState<ProductoTipoClienteFilter>("todos")
  const [peaje, setPeaje] = useState<ProductoPeajeFilter>("todos")
  const [search, setSearch] = useState("")
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelEntry, setPanelEntry] = useState<MarcoRetributivoRow | null>(null)

  const canEditMarco =
    canEditMarcoProp ?? canEditMarcoRetributivo(activeRole)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const result = await listMarcoRetributivo()
    if (result.ok) {
      setMarcoRows(result.data)
      setProducts(result.data.map(marcoRowToProducto))
    }
    setLoading(false)
  }, [])

  function openDetailPanel(product: ProductoTarifa) {
    const row = marcoRows.find((r) => r.id === product.id)
    if (!row) return
    setPanelEntry(row)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setPanelEntry(null)
  }

  async function handleSaveMarco(id: string, patch: Partial<MarcoEntryInput>): Promise<boolean> {
    if (!canEditMarco) return false
    if (!isSupabaseConfigured()) {
      setMarcoRows((prev) => {
        const next = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...patch,
                condicion_1: patch.condicion_1 ?? r.condicion_1,
                condicion_2: patch.condicion_2 ?? r.condicion_2,
                condiciones: patch.condiciones ?? r.condiciones,
                updated_at: new Date().toISOString(),
              }
            : r
        )
        setProducts(next.map(marcoRowToProducto))
        return next
      })
      toast.message("Cambios guardados en memoria local.")
      return true
    }
    const result = await updateMarcoEntry(id, patch, activeUserId)
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    toast.success("Marco retributivo actualizado.")
    await loadProducts()
    return true
  }

  async function handleCreateMarco(_input: NewMarcoEntryInput): Promise<boolean> {
    return false
  }

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const companias = useMemo(() => listCompaniasFromProductos(products), [products])

  const countsByCompania = useMemo(
    () => countProductosByCompania(products, suministro),
    [products, suministro]
  )

  const filtered = useMemo(
    () =>
      filterProductos(products, {
        suministro,
        compania,
        tipoCliente,
        peaje,
        search,
      }),
    [products, suministro, compania, tipoCliente, peaje, search]
  )

  const totalActivas = countsByCompania.Todas ?? 0

  const suministroTabs = [
    { id: "luz" as const, label: "Luz", icon: Lightbulb },
    { id: "gas" as const, label: "Gas", icon: Flame },
    { id: "telefonia" as const, label: "Telefonía", icon: Phone },
  ]

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-brand-text tracking-tight">{title}</h2>
            <p className="text-xs text-brand-subtext mt-1 max-w-2xl leading-relaxed">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateContratos}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border bg-brand-panel text-xs font-bold text-brand-text hover:border-emerald-500/40 hover:text-emerald-600 transition-colors cursor-pointer shrink-0 self-start"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Ir a contratos
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-brand-border pb-3">
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Tipo de producto
            </p>
            <div className="flex flex-wrap gap-1">
              {suministroTabs.map((tab) => {
                const Icon = tab.icon
                const count =
                  tab.id === "telefonia"
                    ? 0
                    : products.filter((p) => p.tipo === tab.id).length
                const isActive = suministro === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSuministro(tab.id)
                      setCompania("Todas")
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? "border-emerald-600 text-emerald-600"
                        : "border-transparent text-brand-subtext hover:text-brand-text"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span className="text-[10px] font-mono opacity-70">[{count}]</span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11px] font-mono text-brand-subtext shrink-0">
            <span className="font-bold text-brand-text">{totalActivas}</span> tarifa
            {totalActivas !== 1 ? "s" : ""} activa{totalActivas !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
            Comercializadora
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCompania("Todas")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                compania === "Todas"
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-brand-border text-brand-subtext hover:border-emerald-500/30"
              }`}
            >
              Todas
              <span className="inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-surface text-[9px] tabular-nums">
                {countsByCompania.Todas ?? 0}
              </span>
            </button>
            {companias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCompania(c)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                  compania === c
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-brand-border text-brand-subtext hover:border-emerald-500/30"
                }`}
              >
                {c}
                <span className="inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-surface text-[9px] tabular-nums">
                  {countsByCompania[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <aside className="w-full xl:w-56 shrink-0 bg-brand-panel border border-brand-border rounded-2xl p-4 space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 text-brand-text">
            <Filter className="h-4 w-4 text-brand-subtext" />
            <span className="text-xs font-bold">Filtros</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Tipo de cliente
            </p>
            <div className="flex flex-col gap-1">
              {PRODUCTO_TIPO_CLIENTE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTipoCliente(opt.id)}
                  className={`text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    tipoCliente === opt.id
                      ? "bg-emerald-600 text-white"
                      : "text-brand-subtext hover:bg-brand-surface hover:text-brand-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Peaje de acceso
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRODUCTO_PEAJE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeaje(opt.id)}
                  className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                    peaje === opt.id
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-brand-surface text-brand-subtext border-brand-border hover:border-emerald-500/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-subtext pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de tarifa o compañía..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-subtext pointer-events-none">
              {filtered.length} tarifa{filtered.length !== 1 ? "s" : ""}
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-16 top-1/2 -translate-y-1/2 text-brand-subtext cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-brand-panel">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-mono">Cargando tarifas…</span>
            </div>
          ) : suministro === "telefonia" ? (
            <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-panel">
              <Phone className="h-8 w-8 mx-auto text-brand-subtext mb-2" />
              <p className="text-sm font-semibold text-brand-text">Telefonía próximamente</p>
              <p className="text-xs text-brand-subtext mt-1">
                No hay tarifas de telefonía activas en el catálogo.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-panel">
              <p className="text-sm font-semibold text-brand-text">Sin tarifas</p>
              <p className="text-xs text-brand-subtext mt-1">
                Ajusta los filtros o prueba otra comercializadora.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filtered.map((product) => (
                <ProductoCard
                  key={product.id}
                  product={product}
                  onCreateContract={onCreateContract}
                  onOpenDetail={openDetailPanel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TarifaDetailPanel
        open={panelOpen}
        entry={panelEntry}
        canEdit={canEditMarco}
        onClose={closePanel}
        onSave={handleSaveMarco}
        onCreate={handleCreateMarco}
      />
    </div>
  )
}
