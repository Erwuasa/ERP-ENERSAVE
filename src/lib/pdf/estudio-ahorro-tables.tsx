import type { CSSProperties, ReactNode } from "react"
import { formatEur, formatNum } from "./estudio-ahorro-calc"
import { SectionTitle } from "./estudio-ahorro-layout"
import { COLORS, GAP } from "./estudio-ahorro-theme"
import type { OtroConceptoRow, PeriodoTarifa, TarifaEstudioAhorro } from "./estudio-ahorro-types"

const PERIODOS: PeriodoTarifa[] = ["P1", "P2", "P3", "P4", "P5", "P6"]
const ROW_HEIGHT = 20
const HEAD_ROW_HEIGHT = 20

export interface MetricRow {
  periodo: PeriodoTarifa
  cantidad: number
  precio: number
  total: number
}

export function buildMetricRows<T extends { periodo: PeriodoTarifa; total: number }>(
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

// Each cell owns its right/bottom hairline and the table owns the top/left one, so every shared
// edge is drawn once (a collapsed-border table renders doubled, gappy lines in html2canvas).
const gridLines: CSSProperties = {
  borderRight: `1px solid ${COLORS.grid}`,
  borderBottom: `1px solid ${COLORS.grid}`,
}

const tableStyle: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
  borderTop: `1px solid ${COLORS.grid}`,
  borderLeft: `1px solid ${COLORS.grid}`,
}

function Th({
  children,
  bg,
  size = 12,
  lineHeight = 14,
  height,
  colSpan,
  rowSpan,
}: {
  children: ReactNode
  bg: string
  size?: number
  lineHeight?: number
  height?: number
  colSpan?: number
  rowSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{
        ...gridLines,
        height,
        padding: 0,
        background: bg,
        color: COLORS.white,
        fontSize: size,
        lineHeight: `${lineHeight}px`,
        fontWeight: 700,
        textAlign: "center",
        verticalAlign: "middle",
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = "center",
  size = 12,
  bold = false,
  bg,
}: {
  children?: ReactNode
  align?: "left" | "center"
  size?: number
  bold?: boolean
  bg?: string
}) {
  return (
    <td
      style={{
        ...gridLines,
        height: ROW_HEIGHT,
        padding: align === "left" ? "0 0 0 5px" : 0,
        background: bg,
        color: COLORS.ink,
        fontSize: size,
        lineHeight: `${ROW_HEIGHT - 1}px`,
        fontWeight: bold ? 700 : 400,
        textAlign: align,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  )
}

/** Quantity, price and total of one tariff side; unused periods stay blank, as in the template. */
function SideCells({ row, tint }: { row: MetricRow; tint: string }) {
  return (
    <>
      <Td>{row.cantidad > 0 ? formatNum(row.cantidad, 2) : ""}</Td>
      <Td size={10}>{row.precio > 0 ? formatNum(row.precio, 6) : ""}</Td>
      <Td bold bg={tint}>
        {row.total > 0 ? formatEur(row.total) : ""}
      </Td>
    </>
  )
}

export function MetricTable({
  title,
  titleColor,
  unitHead,
  priceHead,
  subHeadHeight,
  totalLabel,
  actualRows,
  propuestaRows,
  descuentoActual = 0,
  descuentoPropuesta = 0,
  totalActual,
  totalPropuesta,
}: {
  title: string
  titleColor: string
  unitHead: ReactNode
  priceHead: string
  subHeadHeight: number
  totalLabel: string
  actualRows: MetricRow[]
  propuestaRows: MetricRow[]
  descuentoActual?: number
  descuentoPropuesta?: number
  totalActual: number
  totalPropuesta: number
}) {
  // The discount line only exists when there is one, so the visible rows always add up to the total.
  const hasDescuento = descuentoActual > 0 || descuentoPropuesta > 0

  return (
    <section style={{ marginTop: GAP.betweenSections }}>
      <SectionTitle color={titleColor}>{title}</SectionTitle>
      <table style={tableStyle}>
        <colgroup>
          <col style={{ width: "14.68%" }} />
          {Array.from({ length: 6 }, (_, i) => (
            <col key={i} style={{ width: "14.22%" }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <Th rowSpan={2} bg={COLORS.ink}>
              PERIODOS
            </Th>
            <Th colSpan={3} bg={COLORS.navy} height={HEAD_ROW_HEIGHT}>
              TARIFA ACTUAL
            </Th>
            <Th colSpan={3} bg={COLORS.green} height={HEAD_ROW_HEIGHT}>
              TARIFA PROPUESTA
            </Th>
          </tr>
          <tr>
            {[unitHead, priceHead, "TOTAL"].map((label, i) => (
              <Th key={`a-${i}`} bg={COLORS.navy} size={10.1} lineHeight={11.4} height={subHeadHeight}>
                {label}
              </Th>
            ))}
            {[unitHead, priceHead, "TOTAL"].map((label, i) => (
              <Th key={`p-${i}`} bg={COLORS.green} size={10.1} lineHeight={11.4} height={subHeadHeight}>
                {label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODOS.map((periodo, idx) => (
            <tr key={periodo}>
              <Td align="left">{periodo}</Td>
              <SideCells row={actualRows[idx]} tint={COLORS.tintBlue} />
              <SideCells row={propuestaRows[idx]} tint={COLORS.tintGreen} />
            </tr>
          ))}
          {hasDescuento ? (
            <tr>
              <Td align="left" bold>
                Descuento
              </Td>
              <Td />
              <Td />
              <Td bold bg={COLORS.tintBlue}>
                {descuentoActual > 0 ? formatEur(-descuentoActual) : ""}
              </Td>
              <Td />
              <Td />
              <Td bold bg={COLORS.tintGreen}>
                {descuentoPropuesta > 0 ? formatEur(-descuentoPropuesta) : ""}
              </Td>
            </tr>
          ) : null}
          <tr>
            <Td align="left" bold bg={COLORS.tintRow}>
              {totalLabel}
            </Td>
            <Td bg={COLORS.tintRow} />
            <Td bg={COLORS.tintRow} />
            <Td bold bg={COLORS.tintBlue}>
              {formatEur(totalActual)}
            </Td>
            <Td bg={COLORS.tintRow} />
            <Td bg={COLORS.tintRow} />
            <Td bold bg={COLORS.tintGreen}>
              {formatEur(totalPropuesta)}
            </Td>
          </tr>
        </tbody>
      </table>
    </section>
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
  "Costes adicionales": [
    "Costes adicionales",
    "Otros costes",
    "Compensación",
    "Compensacion",
  ],
  "Alquiler equipo": ["Alquiler equipo", "Alquiler equipos", "Alquiler contador"],
  Excesos: ["Excesos", "Energía reactiva", "Energia reactiva", "Reactiva"],
}

function findConcepto(rows: OtroConceptoRow[], label: string): OtroConceptoRow | undefined {
  const aliases = OTROS_CONCEPTOS_ALIASES[label] ?? [label]
  return rows.find((r) => aliases.some((alias) => alias.trim().toLowerCase() === r.concepto.trim().toLowerCase()))
}

function ConceptoCells({ label, row, tint }: { label: string; row: OtroConceptoRow | undefined; tint: string }) {
  return (
    <>
      <Td align="left">{label}</Td>
      <Td>{row && Math.abs(row.precio) > 0.001 ? formatEur(row.precio) : ""}</Td>
      <Td bold bg={tint}>
        {row ? formatEur(row.total) : ""}
      </Td>
    </>
  )
}

export function OtrosConceptosTable({
  tarifaActual,
  tarifaPropuesta,
}: {
  tarifaActual: TarifaEstudioAhorro
  tarifaPropuesta: TarifaEstudioAhorro
}) {
  const heads = ["CONCEPTO", "PRECIO", "TOTAL"]

  return (
    <section style={{ marginTop: GAP.betweenSections }}>
      <SectionTitle color={COLORS.navy}>Otros Conceptos</SectionTitle>
      <table style={tableStyle}>
        <colgroup>
          {[0, 1].flatMap((side) => [
            <col key={`c-${side}`} style={{ width: "22.7%" }} />,
            <col key={`p-${side}`} style={{ width: "13.65%" }} />,
            <col key={`t-${side}`} style={{ width: "13.65%" }} />,
          ])}
        </colgroup>
        <thead>
          <tr>
            {heads.map((label) => (
              <Th key={`a-${label}`} bg={COLORS.navy} height={ROW_HEIGHT}>
                {label}
              </Th>
            ))}
            {heads.map((label) => (
              <Th key={`p-${label}`} bg={COLORS.green} height={ROW_HEIGHT}>
                {label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OTROS_CONCEPTOS_CANONICOS.map((concepto) => (
            <tr key={concepto}>
              <ConceptoCells label={concepto} row={findConcepto(tarifaActual.otrosConceptos, concepto)} tint={COLORS.tintBlue} />
              <ConceptoCells label={concepto} row={findConcepto(tarifaPropuesta.otrosConceptos, concepto)} tint={COLORS.tintGreen} />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
