import { BRAND } from "./brand-colors"
import { buildDisclaimer, formatEur, formatNum, sumEnergia, sumPotencia } from "./estudio-ahorro-calc"
import type {
  AhorroConjuntoTotales,
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
  OtroConceptoRow,
  PeriodoTarifa,
  TarifaEstudioAhorro,
} from "./estudio-ahorro-types"

/**
 * Plantilla HTML/Tailwind que reproduce, lo más fielmente posible, el diseño del
 * "Estudio de Ahorro Personalizado" (tablas Potencia/Energía/Otros Conceptos en
 * azul vs. verde, Total Factura/Total Oferta, Ahorro). Se exporta a PDF con
 * html2canvas + jsPDF vía `html-to-pdf.ts` — ver `estudio-ahorro-pdf.tsx`.
 */

const NAVY = BRAND.azul
const NAVY_DARK = BRAND.azulOscuro
const NAVY_TINT = "#E3EBF4"
const NAVY_TINT_STRONG = "#CFDCEC"
const GREEN = BRAND.verde
const GREEN_TINT = "#E5F3E6"
const GREEN_TINT_STRONG = "#CCE9CE"
const BORDER = "#D6DEE8"
const ENERSAVE_LOGO_PATH = "/logos/enersave-logo.png"

const PERIODOS: PeriodoTarifa[] = ["P1", "P2", "P3", "P4", "P5", "P6"]

const PAGE_WIDTH = 794
const PAGE_MIN_HEIGHT = 1123

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-sans flex flex-col"
      style={{ width: PAGE_WIDTH, minHeight: PAGE_MIN_HEIGHT, background: BRAND.blanco, color: BRAND.texto, padding: 40 }}
    >
      {children}
    </div>
  )
}

function PageHeader({
  comercializadoraLogoSrc,
  comercializadora,
  indice,
}: {
  comercializadoraLogoSrc: string | null
  comercializadora: string
  indice?: { actual: number; total: number }
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <img src={ENERSAVE_LOGO_PATH} alt="EnerSave" style={{ height: 84, width: "auto" }} />
        <div>
          <h1 className="font-display font-bold text-[20px] leading-[1.15]" style={{ color: NAVY }}>
            Estudio de Ahorro Personalizado
          </h1>
          {indice ? (
            <p className="text-[11px] mt-0.5" style={{ color: BRAND.gris }}>
              Suministro {indice.actual} de {indice.total}
            </p>
          ) : null}
        </div>
      </div>
      {/* Logo real de la comercializadora (bucket de Supabase o copia local ya
          empaquetada). Si no hay imagen disponible no se muestra nada — nunca
          se fabrica un logo con iniciales u otro placeholder. */}
      {comercializadoraLogoSrc ? (
        <img
          src={comercializadoraLogoSrc}
          alt={comercializadora}
          style={{ height: "auto", maxHeight: 92, width: "auto", maxWidth: 260, objectFit: "contain" }}
        />
      ) : null}
    </div>
  )
}

function ClienteBar({ cliente }: { cliente: EstudioAhorroInput["cliente"] }) {
  return (
    <div className="mb-5">
      <p className="text-[11px]" style={{ color: BRAND.gris }}>
        Cliente: <span style={{ color: BRAND.texto, fontWeight: 600 }}>{cliente.nombre}</span> · CUPS:{" "}
        <span style={{ color: BRAND.texto, fontWeight: 600 }}>{cliente.cups}</span>
        {cliente.direccion ? ` · ${cliente.direccion}` : ""}
      </p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display font-bold text-[13px] uppercase tracking-[0.04em] text-center mb-2"
      style={{ color: NAVY }}
    >
      {children}
    </h2>
  )
}

interface MetricRow {
  periodo: PeriodoTarifa
  cantidad: number
  precio: number
  total: number
}

function buildMetricRows<T extends { periodo: PeriodoTarifa; total: number }>(
  rows: T[],
  pickCantidad: (row: T) => number,
  pickPrecio: (row: T) => number
): MetricRow[] {
  return PERIODOS.map((periodo) => {
    const found = rows.find((r) => r.periodo === periodo)
    if (!found) return { periodo, cantidad: 0, precio: 0, total: 0 }
    return { periodo, cantidad: pickCantidad(found), precio: pickPrecio(found), total: found.total }
  })
}

function MetricTable({
  title,
  unitLabel,
  priceLabel,
  actualRows,
  propuestaRows,
  totalActual,
  totalPropuesta,
}: {
  title: string
  unitLabel: string
  priceLabel: string
  actualRows: MetricRow[]
  propuestaRows: MetricRow[]
  totalActual: number
  totalPropuesta: number
}) {
  const cellBase = "px-2 py-1 text-[10px]"
  const numCellBase = `${cellBase} text-right tabular-nums`

  // Solo se muestran los periodos con datos reales a algún lado: los P1-P6 que
  // no traen consumo/potencia ni importe en ninguna tarifa se omiten para no
  // desperdiciar espacio con filas en blanco.
  const visiblePeriods = PERIODOS.filter((_, idx) => {
    const a = actualRows[idx]
    const p = propuestaRows[idx]
    return a.cantidad > 0 || a.total > 0 || p.cantidad > 0 || p.total > 0
  })

  return (
    <div className="mb-6">
      <SectionTitle>{title}</SectionTitle>
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "14.33%" }} />
          <col style={{ width: "14.33%" }} />
          <col style={{ width: "14.34%" }} />
          <col style={{ width: "14.33%" }} />
          <col style={{ width: "14.33%" }} />
          <col style={{ width: "14.34%" }} />
        </colgroup>
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="px-2 py-1 text-[8px] font-bold uppercase align-middle"
              style={{ background: NAVY_DARK, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
            >
              Periodos
            </th>
            <th
              colSpan={3}
              className="px-2 py-1 font-display text-[8px] font-bold uppercase"
              style={{ background: NAVY, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
            >
              Tarifa Actual
            </th>
            <th
              colSpan={3}
              className="px-2 py-1 font-display text-[8px] font-bold uppercase"
              style={{ background: GREEN, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
            >
              Tarifa Propuesta
            </th>
          </tr>
          <tr>
            {[unitLabel, priceLabel, "Total"].map((label) => (
              <th
                key={`a-${label}`}
                className="px-2 py-1 text-[8px] font-bold uppercase"
                style={{ background: NAVY, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
              >
                {label}
              </th>
            ))}
            {[unitLabel, priceLabel, "Total"].map((label) => (
              <th
                key={`p-${label}`}
                className="px-2 py-1 text-[8px] font-bold uppercase"
                style={{ background: GREEN, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visiblePeriods.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-2 py-2 text-[10px] text-center" style={{ color: BRAND.gris, border: `0.5px solid ${BORDER}` }}>
                Sin datos
              </td>
            </tr>
          ) : null}
          {visiblePeriods.map((periodo) => {
            const idx = PERIODOS.indexOf(periodo)
            const a = actualRows[idx]
            const p = propuestaRows[idx]
            return (
              <tr key={periodo}>
                <td className={`${cellBase} font-semibold`} style={{ border: `0.5px solid ${BORDER}` }}>
                  {periodo}
                </td>
                <td className={numCellBase} style={{ background: NAVY_TINT, border: `0.5px solid ${BORDER}` }}>
                  {a.cantidad > 0 ? formatNum(a.cantidad, 3) : "–"}
                </td>
                <td className={numCellBase} style={{ background: NAVY_TINT, border: `0.5px solid ${BORDER}` }}>
                  {a.precio > 0 ? formatNum(a.precio, 4) : "–"}
                </td>
                <td className={numCellBase} style={{ background: NAVY_TINT, border: `0.5px solid ${BORDER}` }}>
                  {a.total > 0 ? formatEur(a.total) : "–"}
                </td>
                <td className={numCellBase} style={{ background: GREEN_TINT, border: `0.5px solid ${BORDER}` }}>
                  {p.cantidad > 0 ? formatNum(p.cantidad, 3) : "–"}
                </td>
                <td className={numCellBase} style={{ background: GREEN_TINT, border: `0.5px solid ${BORDER}` }}>
                  {p.precio > 0 ? formatNum(p.precio, 4) : "–"}
                </td>
                <td className={numCellBase} style={{ background: GREEN_TINT, border: `0.5px solid ${BORDER}` }}>
                  {p.total > 0 ? formatEur(p.total) : "–"}
                </td>
              </tr>
            )
          })}
          <tr>
            <td
              className={`${cellBase} font-display font-bold text-[10.5px]`}
              style={{ background: NAVY_TINT_STRONG, border: `0.5px solid ${BORDER}`, color: NAVY }}
            >
              Total {title.replace("Término de ", "")}:
            </td>
            <td colSpan={2} style={{ background: NAVY_TINT_STRONG, border: `0.5px solid ${BORDER}` }} />
            <td
              className={`${numCellBase} font-display font-bold`}
              style={{ background: NAVY_TINT_STRONG, border: `0.5px solid ${BORDER}`, color: NAVY }}
            >
              {formatEur(totalActual)}
            </td>
            <td colSpan={2} style={{ background: GREEN_TINT_STRONG, border: `0.5px solid ${BORDER}` }} />
            <td
              className={`${numCellBase} font-display font-bold`}
              style={{ background: GREEN_TINT_STRONG, border: `0.5px solid ${BORDER}`, color: GREEN }}
            >
              {formatEur(totalPropuesta)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * Filas fijas de "Otros Conceptos": se muestran siempre, en este orden, igual que en
 * la plantilla original — independientemente de qué conceptos traiga cada tarifa.
 * "Costes adicionales" sustituye a la antigua etiqueta "Compensación" (se aceptan
 * ambos nombres al buscar coincidencia en los datos de entrada).
 */
const OTROS_CONCEPTOS_CANONICOS = ["Bono social", "Alquiler equipo", "Costes adicionales", "Excesos", "IEE", "IVA"]
const OTROS_CONCEPTOS_ALIASES: Record<string, string[]> = {
  "Costes adicionales": ["Costes adicionales", "Compensación", "Compensacion"],
}

function findConcepto(rows: OtroConceptoRow[], label: string): OtroConceptoRow | undefined {
  const aliases = OTROS_CONCEPTOS_ALIASES[label] ?? [label]
  return rows.find((r) => aliases.some((alias) => alias.trim().toLowerCase() === r.concepto.trim().toLowerCase()))
}

function OtrosConceptosTable({ tarifaActual, tarifaPropuesta }: { tarifaActual: TarifaEstudioAhorro; tarifaPropuesta: TarifaEstudioAhorro }) {
  const actual = tarifaActual.otrosConceptos
  const propuesta = tarifaPropuesta.otrosConceptos
  const cellBase = "px-2 py-1 text-[10px]"

  return (
    <div className="mb-6">
      <SectionTitle>Otros Conceptos</SectionTitle>
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "24%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          <tr>
            {["Concepto", "Precio", "Total"].map((label) => (
              <th
                key={`a-${label}`}
                className="py-1.5 px-2 text-[9px] font-bold uppercase text-left"
                style={{ background: NAVY, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
              >
                {label}
              </th>
            ))}
            {["Concepto", "Precio", "Total"].map((label) => (
              <th
                key={`p-${label}`}
                className="py-1.5 px-2 text-[9px] font-bold uppercase text-left"
                style={{ background: GREEN, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OTROS_CONCEPTOS_CANONICOS.map((concepto) => {
            const a = findConcepto(actual, concepto)
            const p = findConcepto(propuesta, concepto)
            return (
              <tr key={concepto}>
                <td className={cellBase} style={{ border: `0.5px solid ${BORDER}` }}>
                  {concepto}
                </td>
                <td className={`${cellBase} text-right tabular-nums`} style={{ background: NAVY_TINT, border: `0.5px solid ${BORDER}` }}>
                  {a ? formatEur(a.precio) : "–"}
                </td>
                <td className={`${cellBase} text-right tabular-nums`} style={{ background: NAVY_TINT, border: `0.5px solid ${BORDER}` }}>
                  {a ? formatEur(a.total) : "–"}
                </td>
                <td className={cellBase} style={{ border: `0.5px solid ${BORDER}` }}>
                  {concepto}
                </td>
                <td className={`${cellBase} text-right tabular-nums`} style={{ background: GREEN_TINT, border: `0.5px solid ${BORDER}` }}>
                  {p ? formatEur(p.precio) : "–"}
                </td>
                <td className={`${cellBase} text-right tabular-nums`} style={{ background: GREEN_TINT, border: `0.5px solid ${BORDER}` }}>
                  {p ? formatEur(p.total) : "–"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TotalsRow({ tarifaActual, tarifaPropuesta }: { tarifaActual: TarifaEstudioAhorro; tarifaPropuesta: TarifaEstudioAhorro }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="flex-1 rounded-md overflow-hidden" style={{ border: `1.5px solid ${NAVY}` }}>
        <div className="text-center py-1.5 font-display font-bold text-[11px] uppercase tracking-[0.03em]" style={{ background: NAVY, color: BRAND.blanco }}>
          Total Factura
        </div>
        <div className="text-center py-4 font-display font-bold text-[22px]" style={{ background: NAVY_TINT, color: NAVY }}>
          {formatEur(tarifaActual.totalFactura)}
        </div>
      </div>
      <div className="flex-1 rounded-md overflow-hidden" style={{ border: `1.5px solid ${GREEN}` }}>
        <div className="text-center py-1.5 font-display font-bold text-[11px] uppercase tracking-[0.03em]" style={{ background: GREEN, color: BRAND.blanco }}>
          Total Oferta
        </div>
        <div className="text-center py-4 font-display font-bold text-[22px]" style={{ background: GREEN_TINT, color: GREEN }}>
          {formatEur(tarifaPropuesta.totalFactura)}
        </div>
      </div>
    </div>
  )
}

function SavingsLine({
  label,
  eur,
  pct,
  emphasis,
}: {
  label: string
  eur: number
  pct: number
  emphasis?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className={`text-[11px] ${emphasis ? "font-bold" : "font-semibold"}`} style={{ color: NAVY }}>
        {label}
      </span>
      <div className="flex gap-2">
        <div
          className="rounded-[5px] px-4 py-1.5 text-[12px] font-display font-bold text-right"
          style={{ background: emphasis ? GREEN_TINT_STRONG : NAVY_TINT, color: emphasis ? GREEN : NAVY, minWidth: 88, border: `0.5px solid ${BORDER}` }}
        >
          {formatEur(eur)}
        </div>
        <div
          className="rounded-[5px] px-4 py-1.5 text-[12px] font-display font-bold text-right"
          style={{ background: emphasis ? GREEN_TINT_STRONG : NAVY_TINT, color: emphasis ? GREEN : NAVY, minWidth: 88, border: `0.5px solid ${BORDER}` }}
        >
          {formatNum(pct, 1)}%
        </div>
      </div>
    </div>
  )
}

function PageFooter({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="mt-auto pt-2.5" style={{ borderTop: `0.5px solid ${BORDER}` }}>
      <p className="text-[8px] text-center leading-relaxed" style={{ color: BRAND.gris }}>
        {disclaimer}
      </p>
    </div>
  )
}

export function EstudioAhorroDetalleTemplate({
  input,
  comercializadoraLogoSrc = null,
  indice,
}: {
  input: EstudioAhorroInput
  /** Logo real ya resuelto (bucket de Supabase o copia local); `null` si no hay imagen. */
  comercializadoraLogoSrc?: string | null
  indice?: { actual: number; total: number }
}) {
  const { tarifaActual, tarifaPropuesta } = input

  const actualPotenciaConPrecio = buildMetricRows(
    tarifaActual.terminoPotencia,
    (r) => r.potenciaContratadaKw,
    (r) => r.precioEurDia
  )
  const propuestaPotenciaConPrecio = buildMetricRows(
    tarifaPropuesta.terminoPotencia,
    (r) => r.potenciaContratadaKw,
    (r) => r.precioEurDia
  )
  const actualEnergiaConPrecio = buildMetricRows(
    tarifaActual.terminoEnergia,
    (r) => r.consumoKwh,
    (r) => r.precioEurKwh
  )
  const propuestaEnergiaConPrecio = buildMetricRows(
    tarifaPropuesta.terminoEnergia,
    (r) => r.consumoKwh,
    (r) => r.precioEurKwh
  )

  return (
    <PageShell>
      <PageHeader
        comercializadoraLogoSrc={comercializadoraLogoSrc}
        comercializadora={tarifaPropuesta.comercializadora}
        indice={indice}
      />
      <ClienteBar cliente={input.cliente} />

      <MetricTable
        title="Término de Potencia"
        unitLabel="Pot. Contratada (Kw)"
        priceLabel="Precio (€/Día)"
        actualRows={actualPotenciaConPrecio}
        propuestaRows={propuestaPotenciaConPrecio}
        totalActual={sumPotencia(tarifaActual)}
        totalPropuesta={sumPotencia(tarifaPropuesta)}
      />

      <MetricTable
        title="Término de Energía"
        unitLabel="Consumo (Kw/h)"
        priceLabel="Precio (€/Kw)"
        actualRows={actualEnergiaConPrecio}
        propuestaRows={propuestaEnergiaConPrecio}
        totalActual={sumEnergia(tarifaActual)}
        totalPropuesta={sumEnergia(tarifaPropuesta)}
      />

      <OtrosConceptosTable tarifaActual={tarifaActual} tarifaPropuesta={tarifaPropuesta} />

      <TotalsRow tarifaActual={tarifaActual} tarifaPropuesta={tarifaPropuesta} />

      <div className="mb-2">
        <SavingsLine label="Ahorro total en el estudio de la factura:" eur={input.ahorroPorFacturaEur} pct={input.ahorroPorFacturaPct} />
        <SavingsLine
          label="Ahorro anual estimado (consumo similar):"
          eur={input.ahorroAnualEur}
          pct={input.ahorroAnualPct}
          emphasis
        />
      </div>

      <PageFooter disclaimer={buildDisclaimer(input.fechaGeneracion)} />
    </PageShell>
  )
}

function ConjuntoStatCard({ label, value, helper, highlight }: { label: string; value: string; helper?: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-md p-3 mb-3"
      style={{ border: `1.5px solid ${highlight ? GREEN : NAVY}`, background: highlight ? GREEN_TINT : BRAND.blanco }}
    >
      <p className="text-[8px] font-bold uppercase tracking-wide" style={{ color: BRAND.gris }}>
        {label}
      </p>
      <p className="font-display font-bold text-[18px] mt-1" style={{ color: highlight ? GREEN : NAVY }}>
        {value}
      </p>
      {helper ? (
        <p className="text-[9px] mt-1 leading-snug" style={{ color: BRAND.gris }}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export function EstudioAhorroConjuntoResumenTemplate({ input, totales }: { input: EstudioAhorroConjuntoInput; totales: AhorroConjuntoTotales }) {
  return (
    <PageShell>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={ENERSAVE_LOGO_PATH} alt="EnerSave" style={{ height: 44, width: "auto" }} />
          <h1 className="font-display font-bold text-[20px]" style={{ color: NAVY }}>
            Ahorro conjunto de la cartera
          </h1>
        </div>
        <p className="text-[10px]" style={{ color: BRAND.gris }}>
          {input.fechaGeneracion}
        </p>
      </div>

      {input.titular ? (
        <div className="mb-5 pb-3" style={{ borderBottom: `0.5px solid ${BORDER}` }}>
          <p className="text-[11px]" style={{ color: BRAND.gris }}>
            Titular: <span style={{ color: BRAND.texto, fontWeight: 600 }}>{input.titular}</span> · {totales.suministros} suministros analizados
          </p>
        </div>
      ) : null}

      <div className="flex gap-6">
        <div style={{ width: "42%" }}>
          <SectionTitle>Ahorro total entre todas las propuestas</SectionTitle>
          <div className="rounded-md p-4 mb-3" style={{ background: GREEN }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: BRAND.blanco, opacity: 0.9 }}>
              Ahorro anual conjunto
            </p>
            <p className="font-display font-bold text-[26px] mt-1" style={{ color: BRAND.blanco }}>
              {formatEur(totales.ahorroAnualEur)}
            </p>
            <p className="text-[9px] mt-1" style={{ color: BRAND.blanco, opacity: 0.92 }}>
              {formatNum(totales.ahorroAnualPct, 1)}% sobre el gasto actual · {totales.suministros} suministros
            </p>
          </div>
          <ConjuntoStatCard label="Gasto actual anual" value={formatEur(totales.gastoActualAnual)} helper="Suma de todos los CUPS, base imponible sin IVA" />
          <ConjuntoStatCard
            label="Gasto propuesto anual"
            value={formatEur(totales.gastoPropuestoAnual)}
            helper="Suma de las ofertas seleccionadas, sin IVA"
            highlight
          />
          <ConjuntoStatCard label="Ahorro medio mensual" value={formatEur(totales.ahorroAnualEur / 12)} helper="Ahorro conjunto repartido en 12 meses" />
        </div>

        <div className="flex-1">
          <SectionTitle>Ahorro por CUPS</SectionTitle>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-[9px] font-bold uppercase" style={{ background: NAVY, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}>
                  CUPS
                </th>
                <th className="text-right py-1.5 px-2 text-[9px] font-bold uppercase" style={{ background: NAVY, color: BRAND.blanco, border: `0.5px solid ${BORDER}` }}>
                  Ahorro anual
                </th>
              </tr>
            </thead>
            <tbody>
              {input.estudios.map((estudio, idx) => (
                <tr key={`${estudio.cliente.cups}-${idx}`}>
                  <td className="px-2 py-1.5" style={{ border: `0.5px solid ${BORDER}` }}>
                    <p className="text-[9px] font-semibold">{estudio.cliente.cups}</p>
                    <p className="text-[8px]" style={{ color: BRAND.gris }}>
                      {estudio.cliente.nombre}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ border: `0.5px solid ${BORDER}` }}>
                    <p className="text-[10px] font-display font-bold" style={{ color: GREEN }}>
                      {formatEur(estudio.ahorroAnualEur)}
                    </p>
                    <p className="text-[8px]" style={{ color: BRAND.gris }}>
                      {formatNum(estudio.ahorroAnualPct, 1)}%
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `2px solid ${NAVY}` }}>
            <span className="font-display font-bold text-[11px]" style={{ color: NAVY }}>
              TOTAL
            </span>
            <span className="font-display font-bold text-[14px]" style={{ color: GREEN }}>
              {formatEur(totales.ahorroAnualEur)}
            </span>
          </div>
        </div>
      </div>

      <PageFooter disclaimer={buildDisclaimer(input.fechaGeneracion)} />
    </PageShell>
  )
}
