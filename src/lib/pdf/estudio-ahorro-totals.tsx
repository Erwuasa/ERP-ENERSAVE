import { formatEur, formatNum } from "./estudio-ahorro-calc"
import { COLORS, GAP } from "./estudio-ahorro-theme"

const LABEL_BAR_HEIGHT = 26
const FIGURE_HEIGHT = 38
const PILL_WIDTH = 109.5
const PILL_HEIGHT = 26

/** Coloured label bar, white body: the body carries no blue/green background. */
function TotalCard({ label, value, barColor, figureColor }: { label: string; value: string; barColor: string; figureColor: string }) {
  return (
    <div className="flex-1">
      <div
        style={{
          height: LABEL_BAR_HEIGHT,
          background: barColor,
          color: COLORS.white,
          fontSize: 13.3,
          lineHeight: `${LABEL_BAR_HEIGHT}px`,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: FIGURE_HEIGHT,
          border: `1px solid ${COLORS.grid}`,
          borderTop: 0,
          background: COLORS.white,
          color: figureColor,
          fontSize: 22.7,
          lineHeight: `${FIGURE_HEIGHT - 1}px`,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function TotalsRow({ totalFactura, totalOferta }: { totalFactura: number; totalOferta: number }) {
  return (
    <div className="flex" style={{ gap: 14, marginTop: GAP.betweenBlocks }}>
      <TotalCard label="Total Factura" value={formatEur(totalFactura)} barColor={COLORS.navy} figureColor={COLORS.totalFactura} />
      <TotalCard label="Total Oferta" value={formatEur(totalOferta)} barColor={COLORS.green} figureColor={COLORS.totalOferta} />
    </div>
  )
}

/** Neutral field: no fill, hairline outline, dark ink. Two of them sit side by side sharing one edge. */
function SavingsField({ children, first }: { children: string; first?: boolean }) {
  return (
    <div
      style={{
        width: PILL_WIDTH,
        height: PILL_HEIGHT,
        marginLeft: first ? 0 : -1,
        border: `1px solid ${COLORS.neutralLine}`,
        background: COLORS.white,
        color: COLORS.neutralInk,
        fontSize: 13.3,
        lineHeight: `${PILL_HEIGHT - 2}px`,
        fontWeight: 700,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  )
}

function SavingsLine({ label, eur, pct }: { label: string; eur: number; pct: number }) {
  return (
    <div className="flex items-center justify-between" style={{ height: PILL_HEIGHT }}>
      <span style={{ fontSize: 13.3, fontWeight: 700, color: COLORS.ink }}>{label}</span>
      <div className="flex">
        <SavingsField first>{formatEur(eur)}</SavingsField>
        <SavingsField>{`${formatNum(pct, 2)} %`}</SavingsField>
      </div>
    </div>
  )
}

export function SavingsBlock({
  ahorroPorFacturaEur,
  ahorroPorFacturaPct,
  ahorroAnualEur,
  ahorroAnualPct,
}: {
  ahorroPorFacturaEur: number
  ahorroPorFacturaPct: number
  ahorroAnualEur: number
  ahorroAnualPct: number
}) {
  return (
    <div className="flex flex-col" style={{ gap: GAP.betweenBlocks, marginTop: GAP.betweenBlocks }}>
      <SavingsLine label="Ahorro total en el estudio de la factura:" eur={ahorroPorFacturaEur} pct={ahorroPorFacturaPct} />
      <SavingsLine label="Ahorro anual estimado (consumo similar):" eur={ahorroAnualEur} pct={ahorroAnualPct} />
    </div>
  )
}
