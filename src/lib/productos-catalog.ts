import type { TipoClienteContrato } from "./contract-registration"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

export type ProductoSuministroTab = "luz" | "gas" | "telefonia"

export type ProductoTipoClienteFilter =
  | "todos"
  | "particular"
  | "autonomo"
  | "empresa"
  | "comunidad"
  | "ayuntamiento"

export type ProductoPeajeFilter =
  | "todos"
  | "2.0TD"
  | "3.0TD"
  | "6.1TD"
  | "6.2TD"
  | "6.3TD"
  | "6.4TD"

export interface ProductoTarifaPrecios {
  energia: Partial<Record<`p${1 | 2 | 3 | 4 | 5 | 6}`, number>>
  potencia: Partial<Record<`p${1 | 2 | 3 | 4 | 5 | 6}`, number>>
}

export interface ProductoTarifa {
  id: string
  compania: string
  tarifa: string
  tipo: "luz" | "gas"
  peaje: string
  segmento: MarcoRetributivoRow["segmento"]
  tipoClienteLabel: string
  tipoCliente: TipoClienteContrato
  wizardSegment: "residencial" | "pyme"
  precios: ProductoTarifaPrecios
}

export const PRODUCTO_TIPO_CLIENTE_OPTIONS: {
  id: ProductoTipoClienteFilter
  label: string
}[] = [
  { id: "todos", label: "Todos" },
  { id: "particular", label: "Particular" },
  { id: "autonomo", label: "Autónomo" },
  { id: "empresa", label: "Empresa" },
  { id: "comunidad", label: "Comunidad" },
  { id: "ayuntamiento", label: "Ayuntamiento" },
]

export const PRODUCTO_PEAJE_OPTIONS: { id: ProductoPeajeFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "2.0TD", label: "2.0TD" },
  { id: "3.0TD", label: "3.0TD" },
  { id: "6.1TD", label: "6.1TD" },
  { id: "6.2TD", label: "6.2TD" },
  { id: "6.3TD", label: "6.3TD" },
  { id: "6.4TD", label: "6.4TD" },
]

function inferTipoCliente(row: MarcoRetributivoRow): {
  label: string
  value: TipoClienteContrato
  wizardSegment: "residencial" | "pyme"
} {
  const text = `${row.condiciones ?? ""} ${row.condicion_1 ?? ""} ${row.condicion_2 ?? ""}`.toLowerCase()

  if (row.segmento === "autonomo" || text.includes("autónom") || text.includes("autonom")) {
    return { label: "Autónomo", value: "autonomo", wizardSegment: "residencial" }
  }
  if (row.segmento === "comunidades" || text.includes("comunidad") || text.includes("vecinos")) {
    return { label: "Comunidad", value: "comunidad_vecinos", wizardSegment: "residencial" }
  }
  if (row.segmento === "pyme" || text.includes("pyme") || text.includes("industrial") || text.includes("negocio")) {
    return { label: "Empresa", value: "pyme", wizardSegment: "pyme" }
  }
  if (row.segmento === "residencial" || text.includes("residencial") || text.includes("hogar")) {
    return { label: "Particular", value: "residencial", wizardSegment: "residencial" }
  }
  return { label: "Particular", value: "residencial", wizardSegment: "residencial" }
}

function readPrecio(row: MarcoRetributivoRow, prefix: "energia" | "potencia", n: number): number | null {
  const key = `${prefix}_p${n}` as keyof MarcoRetributivoRow
  const val = row[key]
  if (val == null || val === "") return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function syntheticPrecios(row: MarcoRetributivoRow): ProductoTarifaPrecios {
  const isGas = row.tipo === "gas"
  const is30 = row.peaje.includes("3.0") || row.peaje.includes("6.0")
  const base = 0.1 + (row.comision_base % 20) / 1000

  if (isGas) {
    return {
      energia: { p1: round4(base + 0.02), p2: round4(base + 0.015) },
      potencia: { p1: round4(0.035), p2: round4(0.03) },
    }
  }

  if (is30) {
    return {
      energia: {
        p1: round4(base + 0.012),
        p2: round4(base + 0.008),
        p3: round4(base + 0.006),
        p4: round4(base + 0.004),
        p5: round4(base + 0.003),
        p6: round4(base + 0.002),
      },
      potencia: {
        p1: round4(0.058),
        p2: round4(0.051),
        p3: round4(0.044),
      },
    }
  }

  return {
    energia: { p1: round4(base + 0.018), p2: round4(base + 0.012), p3: round4(base + 0.009) },
    potencia: { p1: round4(0.043), p2: round4(0.036) },
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

function extractPrecios(row: MarcoRetributivoRow): ProductoTarifaPrecios {
  const energia: ProductoTarifaPrecios["energia"] = {}
  const potencia: ProductoTarifaPrecios["potencia"] = {}

  for (let i = 1; i <= 6; i++) {
    const e = readPrecio(row, "energia", i)
    const p = readPrecio(row, "potencia", i)
    if (e != null) energia[`p${i}` as keyof typeof energia] = e
    if (p != null) potencia[`p${i}` as keyof typeof potencia] = p
  }

  if (Object.keys(energia).length === 0 && Object.keys(potencia).length === 0) {
    return syntheticPrecios(row)
  }
  return { energia, potencia }
}

export function marcoRowToProducto(row: MarcoRetributivoRow): ProductoTarifa {
  const tipoCliente = inferTipoCliente(row)
  return {
    id: row.id,
    compania: row.compania,
    tarifa: row.tarifa,
    tipo: row.tipo,
    peaje: row.peaje,
    segmento: row.segmento,
    tipoClienteLabel: tipoCliente.label,
    tipoCliente: tipoCliente.value,
    wizardSegment: tipoCliente.wizardSegment,
    precios: extractPrecios(row),
  }
}

function matchesTipoClienteFilter(
  product: ProductoTarifa,
  filter: ProductoTipoClienteFilter
): boolean {
  if (filter === "todos") return true
  if (filter === "particular") return product.tipoCliente === "residencial"
  if (filter === "autonomo") return product.tipoCliente === "autonomo"
  if (filter === "empresa") return product.tipoCliente === "pyme"
  if (filter === "comunidad") return product.tipoCliente === "comunidad_vecinos"
  if (filter === "ayuntamiento") return product.tipoClienteLabel === "Ayuntamiento"
  return true
}

function matchesPeajeFilter(product: ProductoTarifa, filter: ProductoPeajeFilter): boolean {
  if (filter === "todos") return true
  if (filter === "2.0TD") return product.peaje.includes("2.0")
  if (filter === "3.0TD") return product.peaje.includes("3.0")
  return product.peaje.includes(filter)
}

export function filterProductos(
  products: ProductoTarifa[],
  options: {
    suministro: ProductoSuministroTab
    compania: string
    tipoCliente: ProductoTipoClienteFilter
    peaje: ProductoPeajeFilter
    search: string
  }
): ProductoTarifa[] {
  if (options.suministro === "telefonia") return []

  return products.filter((p) => {
    if (p.tipo !== options.suministro) return false
    if (options.compania !== "Todas" && p.compania !== options.compania) return false
    if (!matchesTipoClienteFilter(p, options.tipoCliente)) return false
    if (!matchesPeajeFilter(p, options.peaje)) return false
    if (options.search.trim()) {
      const q = options.search.toLowerCase()
      if (
        !p.tarifa.toLowerCase().includes(q) &&
        !p.compania.toLowerCase().includes(q) &&
        !p.peaje.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })
}

export function countProductosByCompania(
  products: ProductoTarifa[],
  suministro: ProductoSuministroTab
): Record<string, number> {
  const scoped =
    suministro === "telefonia"
      ? []
      : products.filter((p) => p.tipo === suministro)
  const counts: Record<string, number> = { Todas: scoped.length }
  for (const p of scoped) {
    counts[p.compania] = (counts[p.compania] ?? 0) + 1
  }
  return counts
}

export function listCompaniasFromProductos(products: ProductoTarifa[]): string[] {
  return Array.from(new Set(products.map((p) => p.compania))).sort((a, b) =>
    a.localeCompare(b, "es")
  )
}

export function formatPrecioEnergia(value: number): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €/kWh`
}

export function formatPrecioPotencia(value: number): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €/kW·día`
}
