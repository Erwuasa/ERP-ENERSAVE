import { ENERSAVE_LOGO_PATH } from "./enersave-logo"
import { sumEnergia, sumPotencia } from "./estudio-ahorro-calc"
import { ClientInfo } from "./estudio-ahorro-client-info"
import { BrandHeader, PageShell } from "./estudio-ahorro-layout"
import { MetricTable, OtrosConceptosTable, buildMetricRows } from "./estudio-ahorro-tables"
import { COLORS } from "./estudio-ahorro-theme"
import { SavingsBlock, TotalsRow } from "./estudio-ahorro-totals"
import type { EstudioAhorroInput } from "./estudio-ahorro-types"

/**
 * Plantilla HTML que reproduce el diseño original del "Estudio de Ahorro Personalizado"
 * (tablas Potencia/Energía/Otros Conceptos en azul vs. verde, Total Factura/Total Oferta,
 * Ahorro). Se exporta a PDF con html2canvas + jsPDF vía `html-to-pdf.ts` — ver
 * `estudio-ahorro-pdf.tsx`. Las medidas y colores viven en `estudio-ahorro-theme.ts`.
 */
export { EstudioAhorroConjuntoResumenTemplate } from "./estudio-ahorro-conjunto-template"

export function EstudioAhorroDetalleTemplate({
  input,
  comercializadoraLogoSrc = null,
  enersaveLogoSrc = ENERSAVE_LOGO_PATH,
  indice,
}: {
  input: EstudioAhorroInput
  /** Logo real ya resuelto (bucket de Supabase o copia local); `null` si no hay imagen. */
  comercializadoraLogoSrc?: string | null
  /** EnerSave logo already trimmed to its content (see `resolveEnersaveLogoSrc`). */
  enersaveLogoSrc?: string
  indice?: { actual: number; total: number }
}) {
  const { tarifaActual, tarifaPropuesta } = input

  return (
    <PageShell>
      <BrandHeader
        title="Estudio de Ahorro Personalizado"
        subtitle={indice ? `Suministro ${indice.actual} de ${indice.total}` : undefined}
        enersaveLogoSrc={enersaveLogoSrc}
      />
      <ClientInfo
        cliente={input.cliente}
        comercializadora={tarifaPropuesta.comercializadora}
        comercializadoraLogoSrc={comercializadoraLogoSrc}
      />

      <MetricTable
        title="Término de Potencia"
        titleColor={COLORS.navy}
        unitHead={
          <>
            POT.
            <br />
            CONTRATADA
            <br />
            (Kw)
          </>
        }
        priceHead="PRECIO (€/Día)"
        subHeadHeight={41}
        totalLabel="Total Potencia:"
        actualRows={buildMetricRows(tarifaActual.terminoPotencia, (r) => r.potenciaContratadaKw, (r) => r.precioEurDia)}
        propuestaRows={buildMetricRows(tarifaPropuesta.terminoPotencia, (r) => r.potenciaContratadaKw, (r) => r.precioEurDia)}
        descuentoActual={tarifaActual.descuentoPotencia}
        descuentoPropuesta={tarifaPropuesta.descuentoPotencia}
        totalActual={sumPotencia(tarifaActual)}
        totalPropuesta={sumPotencia(tarifaPropuesta)}
      />

      <MetricTable
        title="Término de Energía"
        titleColor={COLORS.green}
        unitHead="CONSUMO (Kw/h)"
        priceHead="PRECIO (€/Kw)"
        subHeadHeight={18}
        totalLabel="Total Energía:"
        actualRows={buildMetricRows(tarifaActual.terminoEnergia, (r) => r.consumoKwh, (r) => r.precioEurKwh)}
        propuestaRows={buildMetricRows(tarifaPropuesta.terminoEnergia, (r) => r.consumoKwh, (r) => r.precioEurKwh)}
        descuentoActual={tarifaActual.descuentoEnergia}
        descuentoPropuesta={tarifaPropuesta.descuentoEnergia}
        totalActual={sumEnergia(tarifaActual)}
        totalPropuesta={sumEnergia(tarifaPropuesta)}
      />

      <OtrosConceptosTable tarifaActual={tarifaActual} tarifaPropuesta={tarifaPropuesta} />

      <TotalsRow totalFactura={tarifaActual.totalFactura} totalOferta={tarifaPropuesta.totalFactura} />

      <SavingsBlock
        ahorroPorFacturaEur={input.ahorroPorFacturaEur}
        ahorroPorFacturaPct={input.ahorroPorFacturaPct}
        ahorroAnualEur={input.ahorroAnualEur}
        ahorroAnualPct={input.ahorroAnualPct}
      />
    </PageShell>
  )
}
