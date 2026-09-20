import type { ReactNode } from "react"
import { formatEur, formatNum } from "./estudio-ahorro-calc"
import { BrandHeader, PageShell } from "./estudio-ahorro-layout"
import { COLORS } from "./estudio-ahorro-theme"
import type { AhorroConjuntoTotales, EstudioAhorroConjuntoInput } from "./estudio-ahorro-types"
import { ENERSAVE_LOGO_PATH } from "./enersave-logo"

function SummaryHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-center mb-2" style={{ fontFamily: "inherit", color: COLORS.navy }}>
      {children}
    </h2>
  )
}

function ConjuntoStatCard({ label, value, helper, highlight }: { label: string; value: string; helper?: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-md p-3 mb-3"
      style={{ border: `1.5px solid ${highlight ? COLORS.green : COLORS.navy}`, background: highlight ? COLORS.tintGreen : COLORS.white }}
    >
      <p className="text-[8px] font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
        {label}
      </p>
      <p className="font-bold text-[18px] mt-1" style={{ color: highlight ? COLORS.green : COLORS.navy }}>
        {value}
      </p>
      {helper ? (
        <p className="text-[9px] mt-1 leading-snug" style={{ color: COLORS.muted }}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export function EstudioAhorroConjuntoResumenTemplate({
  input,
  totales,
  enersaveLogoSrc = ENERSAVE_LOGO_PATH,
}: {
  input: EstudioAhorroConjuntoInput
  totales: AhorroConjuntoTotales
  /** EnerSave logo already trimmed to its content (see `resolveEnersaveLogoSrc`). */
  enersaveLogoSrc?: string
}) {
  return (
    <PageShell>
      <BrandHeader title="Ahorro conjunto de la cartera" subtitle={input.fechaGeneracion} enersaveLogoSrc={enersaveLogoSrc} />

      {input.titular ? (
        <div className="mt-5 mb-5 pb-3" style={{ borderBottom: `1px solid ${COLORS.grid}` }}>
          <p className="text-[11px]" style={{ color: COLORS.muted }}>
            Titular: <span style={{ color: COLORS.ink, fontWeight: 600 }}>{input.titular}</span> · {totales.suministros} suministros analizados
          </p>
        </div>
      ) : (
        <div className="mb-5" />
      )}

      <div className="flex gap-6">
        <div style={{ width: "42%" }}>
          <SummaryHeading>Ahorro total entre todas las propuestas</SummaryHeading>
          <div className="rounded-md p-4 mb-3" style={{ background: COLORS.green }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.white, opacity: 0.9 }}>
              Ahorro anual conjunto
            </p>
            <p className="font-bold text-[26px] mt-1" style={{ color: COLORS.white }}>
              {formatEur(totales.ahorroAnualEur)}
            </p>
            <p className="text-[9px] mt-1" style={{ color: COLORS.white, opacity: 0.92 }}>
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
          <SummaryHeading>Ahorro por CUPS</SummaryHeading>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-[9px] font-bold uppercase" style={{ background: COLORS.navy, color: COLORS.white, border: `1px solid ${COLORS.grid}` }}>
                  CUPS
                </th>
                <th className="text-right py-1.5 px-2 text-[9px] font-bold uppercase" style={{ background: COLORS.navy, color: COLORS.white, border: `1px solid ${COLORS.grid}` }}>
                  Ahorro anual
                </th>
              </tr>
            </thead>
            <tbody>
              {input.estudios.map((estudio, idx) => (
                <tr key={`${estudio.cliente.cups}-${idx}`}>
                  <td className="px-2 py-1.5" style={{ border: `1px solid ${COLORS.grid}` }}>
                    <p className="text-[9px] font-semibold">{estudio.cliente.cups}</p>
                    <p className="text-[8px]" style={{ color: COLORS.muted }}>
                      {estudio.cliente.nombre}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ border: `1px solid ${COLORS.grid}` }}>
                    <p className="text-[10px] font-bold" style={{ color: COLORS.green }}>
                      {formatEur(estudio.ahorroAnualEur)}
                    </p>
                    <p className="text-[8px]" style={{ color: COLORS.muted }}>
                      {formatNum(estudio.ahorroAnualPct, 1)}%
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `2px solid ${COLORS.navy}` }}>
            <span className="font-bold text-[11px]" style={{ color: COLORS.navy }}>
              TOTAL
            </span>
            <span className="font-bold text-[14px]" style={{ color: COLORS.green }}>
              {formatEur(totales.ahorroAnualEur)}
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
