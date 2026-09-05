import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer"
import {
  getEnersaveLogoPlaceholder,
  resolveComercializadoraLogoSrc,
} from "./comercializadora-logos"
import { BRAND, pdfStyles as s } from "./estudio-ahorro-styles"
import type {
  AhorroConjuntoTotales,
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
  OtroConceptoRow,
  TarifaEstudioAhorro,
} from "./estudio-ahorro-types"

function formatEur(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNum(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function sumPotencia(t: TarifaEstudioAhorro): number {
  const bruto = t.terminoPotencia.reduce((acc, r) => acc + r.total, 0)
  return bruto - (t.descuentoPotencia ?? 0)
}

function sumEnergia(t: TarifaEstudioAhorro): number {
  const bruto = t.terminoEnergia.reduce((acc, r) => acc + r.total, 0)
  return bruto - (t.descuentoEnergia ?? 0)
}

function sumOtros(rows: OtroConceptoRow[]): number {
  return rows.reduce((acc, r) => acc + r.total, 0)
}

function calcBaseImponible(t: TarifaEstudioAhorro): number {
  return sumPotencia(t) + sumEnergia(t) + sumOtros(t.otrosConceptos)
}

function calcIva(base: number, pct: number): number {
  return base * (pct / 100)
}

function filterOtros(rows: OtroConceptoRow[]): OtroConceptoRow[] {
  return rows.filter((r) => Math.abs(r.precio) > 0.001 || Math.abs(r.total) > 0.001)
}

function hasOtrosConceptos(input: EstudioAhorroInput): boolean {
  return (
    filterOtros(input.tarifaActual.otrosConceptos).length > 0 ||
    filterOtros(input.tarifaPropuesta.otrosConceptos).length > 0
  )
}

function PotenciaTable({ tarifa }: { tarifa: TarifaEstudioAhorro }) {
  const rows = tarifa.terminoPotencia.filter((r) => r.potenciaContratadaKw > 0)
  if (rows.length === 0) return <Text style={{ fontSize: 7, color: BRAND.gris }}>Sin datos</Text>

  return (
    <>
      <View style={s.tableHeader}>
        <Text style={[s.th, s.colPeriod]}>Per.</Text>
        <Text style={[s.th, s.colMid]}>Pot. (kW)</Text>
        <Text style={[s.th, s.colPrice]}>€/día</Text>
        <Text style={[s.th, s.colTotal]}>Total</Text>
      </View>
      {rows.map((row) => (
        <View key={`pot-${row.periodo}`} style={s.tableRow}>
          <Text style={[s.td, s.colPeriod]}>{row.periodo}</Text>
          <Text style={[s.td, s.colMid]}>{formatNum(row.potenciaContratadaKw, 3)}</Text>
          <Text style={[s.td, s.colPrice]}>{formatNum(row.precioEurDia, 4)}</Text>
          <Text style={[s.td, s.colTotal]}>{formatEur(row.total)}</Text>
        </View>
      ))}
      {(tarifa.descuentoPotencia ?? 0) > 0 && (
        <View style={s.tableRow}>
          <Text style={[s.td, { width: "73%" }]}>Descuento potencia</Text>
          <Text style={[s.td, s.colTotal]}>-{formatEur(tarifa.descuentoPotencia!)}</Text>
        </View>
      )}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total Potencia</Text>
        <Text style={s.totalLabel}>{formatEur(sumPotencia(tarifa))}</Text>
      </View>
    </>
  )
}

function EnergiaTable({ tarifa }: { tarifa: TarifaEstudioAhorro }) {
  const rows = tarifa.terminoEnergia.filter((r) => r.consumoKwh > 0)
  if (rows.length === 0) return <Text style={{ fontSize: 7, color: BRAND.gris }}>Sin datos</Text>

  return (
    <>
      <View style={s.tableHeader}>
        <Text style={[s.th, s.colPeriod]}>Per.</Text>
        <Text style={[s.th, s.colMid]}>Cons. (kWh)</Text>
        <Text style={[s.th, s.colPrice]}>€/kWh</Text>
        <Text style={[s.th, s.colTotal]}>Total</Text>
      </View>
      {rows.map((row) => (
        <View key={`ene-${row.periodo}`} style={s.tableRow}>
          <Text style={[s.td, s.colPeriod]}>{row.periodo}</Text>
          <Text style={[s.td, s.colMid]}>{formatNum(row.consumoKwh, 0)}</Text>
          <Text style={[s.td, s.colPrice]}>{formatNum(row.precioEurKwh, 4)}</Text>
          <Text style={[s.td, s.colTotal]}>{formatEur(row.total)}</Text>
        </View>
      ))}
      {(tarifa.descuentoEnergia ?? 0) > 0 && (
        <View style={s.tableRow}>
          <Text style={[s.td, { width: "73%" }]}>Descuento energía</Text>
          <Text style={[s.td, s.colTotal]}>-{formatEur(tarifa.descuentoEnergia!)}</Text>
        </View>
      )}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>Total Energía</Text>
        <Text style={s.totalLabel}>{formatEur(sumEnergia(tarifa))}</Text>
      </View>
    </>
  )
}

function OtrosTable({ tarifa }: { tarifa: TarifaEstudioAhorro }) {
  const rows = filterOtros(tarifa.otrosConceptos)
  if (rows.length === 0) return <Text style={{ fontSize: 7, color: BRAND.gris }}>Sin conceptos</Text>

  return (
    <>
      <View style={s.tableHeader}>
        <Text style={[s.th, s.colConcept]}>Concepto</Text>
        <Text style={[s.th, s.colConceptPrice]}>Precio</Text>
        <Text style={[s.th, s.colConceptTotal]}>Total</Text>
      </View>
      {rows.map((row) => (
        <View key={row.concepto} style={s.tableRow}>
          <Text style={[s.td, s.colConcept]}>{row.concepto}</Text>
          <Text style={[s.td, s.colConceptPrice]}>{formatEur(row.precio)}</Text>
          <Text style={[s.td, s.colConceptTotal]}>{formatEur(row.total)}</Text>
        </View>
      ))}
    </>
  )
}

function TarifaBlockHeader({
  titulo,
  tarifa,
}: {
  titulo: string
  tarifa: TarifaEstudioAhorro
}) {
  const logoSrc = resolveComercializadoraLogoSrc(tarifa.comercializadora, tarifa.logoUrl)

  return (
    <View style={s.blockHeader}>
      <Image src={logoSrc} style={s.logo} />
      <View>
        <Text style={s.blockHeaderLabel}>{titulo}</Text>
        <Text style={s.blockTarifaName}>{tarifa.comercializadora}</Text>
        <Text style={{ fontSize: 6.5, color: BRAND.gris }}>{tarifa.nombreTarifa}</Text>
      </View>
    </View>
  )
}

function InvoiceSummaryCard({
  titulo,
  tarifa,
  destacarVerde,
}: {
  titulo: string
  tarifa: TarifaEstudioAhorro
  destacarVerde?: boolean
}) {
  const base = calcBaseImponible(tarifa)
  const iva = calcIva(base, tarifa.ivaPct)

  return (
    <View style={[s.invoiceCard, ...(destacarVerde ? [s.invoiceCardPropuesta] : [])]}>
      <Text style={[s.blockHeaderLabel, { marginBottom: 6 }]}>{titulo}</Text>
      <View style={s.invoiceLine}>
        <Text style={{ fontSize: 7, color: BRAND.gris }}>Base imponible</Text>
        <Text style={{ fontSize: 7 }}>{formatEur(base)}</Text>
      </View>
      <View style={s.invoiceLine}>
        <Text style={{ fontSize: 7, color: BRAND.gris }}>IVA ({tarifa.ivaPct}%)</Text>
        <Text style={{ fontSize: 7 }}>{formatEur(iva)}</Text>
      </View>
      <View style={s.invoiceLine}>
        <Text style={{ fontSize: 8, fontFamily: "SF Pro Display", fontWeight: "bold" }}>TOTAL FACTURA</Text>
        <Text
          style={[
            s.invoiceTotal,
            ...(destacarVerde ? [s.invoiceTotalVerde] : []),
          ]}
        >
          {formatEur(tarifa.totalFactura)}
        </Text>
      </View>
    </View>
  )
}

function PageFooter({ disclaimer }: { disclaimer: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{disclaimer}</Text>
    </View>
  )
}

function buildDisclaimer(fechaGeneracion: string): string {
  const year = new Date().getFullYear()
  return `© ${year} EnerSave. Todos los derechos reservados. Generado el ${fechaGeneracion}. Disclaimer: Informe informativo sujeto a validación comercial y técnica.`
}

/**
 * Totales de cartera sobre base imponible: el ahorro anual por CUPS del comparador
 * es un importe sin IVA, así que gasto actual y propuesto se expresan igual para
 * que las tres cifras cuadren con el listado de CUPS.
 */
export function calcTotalesConjunto(estudios: EstudioAhorroInput[]): AhorroConjuntoTotales {
  const gastoActualAnual = estudios.reduce((acc, e) => acc + calcBaseImponible(e.tarifaActual), 0)
  const ahorroAnualEur = estudios.reduce((acc, e) => acc + e.ahorroAnualEur, 0)
  return {
    gastoActualAnual,
    gastoPropuestoAnual: Math.max(0, gastoActualAnual - ahorroAnualEur),
    ahorroAnualEur,
    ahorroAnualPct: gastoActualAnual > 0 ? (ahorroAnualEur / gastoActualAnual) * 100 : 0,
    suministros: estudios.length,
  }
}

interface EstudioDetallePageProps {
  key?: string
  input: EstudioAhorroInput
  disclaimer: string
  indice?: { actual: number; total: number }
}

function EstudioDetallePage({ input, disclaimer, indice }: EstudioDetallePageProps) {
  const showOtros = hasOtrosConceptos(input)

  return (
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Image src={getEnersaveLogoPlaceholder()} style={{ width: 100, height: 26 }} />
            <Text style={s.title}>
              {indice
                ? `Estudio de Ahorro · Suministro ${indice.actual} de ${indice.total}`
                : "Estudio de Ahorro Personalizado"}
            </Text>
          </View>
          <Text style={s.fecha}>{input.fechaGeneracion}</Text>
        </View>

        <View style={s.clienteBox}>
          <Text style={s.clienteText}>
            Cliente: {input.cliente.nombre} · CUPS: {input.cliente.cups}
            {input.cliente.direccion ? ` · ${input.cliente.direccion}` : ""}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Término de Potencia</Text>
        <View style={s.twoCols}>
          <View style={[s.col, s.block]}>
            <TarifaBlockHeader titulo="Tarifa actual" tarifa={input.tarifaActual} />
            <PotenciaTable tarifa={input.tarifaActual} />
          </View>
          <View style={[s.col, s.block]}>
            <TarifaBlockHeader titulo="Tarifa propuesta" tarifa={input.tarifaPropuesta} />
            <PotenciaTable tarifa={input.tarifaPropuesta} />
          </View>
        </View>

        <Text style={s.sectionTitle}>Término de Energía</Text>
        <View style={s.twoCols}>
          <View style={[s.col, s.block]}>
            <TarifaBlockHeader titulo="Tarifa actual" tarifa={input.tarifaActual} />
            <EnergiaTable tarifa={input.tarifaActual} />
          </View>
          <View style={[s.col, s.block]}>
            <TarifaBlockHeader titulo="Tarifa propuesta" tarifa={input.tarifaPropuesta} />
            <EnergiaTable tarifa={input.tarifaPropuesta} />
          </View>
        </View>

        {showOtros && (
          <>
            <Text style={s.sectionTitle}>Otros Conceptos</Text>
            <View style={s.twoCols}>
              <View style={[s.col, s.block]}>
                <TarifaBlockHeader titulo="Tarifa actual" tarifa={input.tarifaActual} />
                <OtrosTable tarifa={input.tarifaActual} />
              </View>
              <View style={[s.col, s.block]}>
                <TarifaBlockHeader titulo="Tarifa propuesta" tarifa={input.tarifaPropuesta} />
                <OtrosTable tarifa={input.tarifaPropuesta} />
              </View>
            </View>
          </>
        )}

        <View style={[s.invoiceCardsRow, { marginTop: 10 }]}>
          <InvoiceSummaryCard titulo="Tarifa actual" tarifa={input.tarifaActual} />
          <InvoiceSummaryCard
            titulo="Tarifa propuesta"
            tarifa={input.tarifaPropuesta}
            destacarVerde={input.tarifaPropuesta.totalFactura < input.tarifaActual.totalFactura}
          />
        </View>

        <PageFooter disclaimer={disclaimer} />
      </Page>
  )
}

function EstudioResumenPage({
  input,
  disclaimer,
}: {
  input: EstudioAhorroInput
  disclaimer: string
}) {
  return (
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={[s.title, { fontSize: 13 }]}>Resumen económico</Text>
          <Text style={s.fecha}>{input.fechaGeneracion}</Text>
        </View>

        <View style={s.invoiceCardsRow}>
          <InvoiceSummaryCard titulo="Tarifa actual" tarifa={input.tarifaActual} />
          <InvoiceSummaryCard
            titulo="Tarifa propuesta"
            tarifa={input.tarifaPropuesta}
            destacarVerde
          />
        </View>

        <View style={s.savingsBanner}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.savingsTitle}>Ahorro estimado</Text>
            <Text style={s.savingsSubtitle}>Optimización de costes energéticos</Text>
          </View>
          <View style={s.savingsCards}>
            <View style={s.savingsCard}>
              <Text style={s.savingsCardLabel}>Ahorro por factura</Text>
              <Text style={s.savingsCardValue}>{formatEur(input.ahorroPorFacturaEur)}</Text>
              <Text style={{ fontSize: 7, color: BRAND.gris, marginTop: 2 }}>
                {formatNum(input.ahorroPorFacturaPct, 1)}% vs. actual
              </Text>
            </View>
            <View style={[s.savingsCard, s.savingsCardHighlight]}>
              <Text style={s.savingsCardLabel}>Ahorro anual</Text>
              <Text style={[s.savingsCardValue, s.savingsCardValueLarge]}>
                {formatEur(input.ahorroAnualEur)}
              </Text>
              <Text style={{ fontSize: 7, color: BRAND.gris, marginTop: 2 }}>
                {formatNum(input.ahorroAnualPct, 1)}% vs. actual
              </Text>
            </View>
          </View>
        </View>

        <PageFooter disclaimer={disclaimer} />
      </Page>
  )
}

export function EstudioAhorroDocument({ input }: { input: EstudioAhorroInput }) {
  const disclaimer = buildDisclaimer(input.fechaGeneracion)

  return (
    <Document title="Estudio de Ahorro Personalizado" author="EnerSave">
      <EstudioDetallePage input={input} disclaimer={disclaimer} />
      <EstudioResumenPage input={input} disclaimer={disclaimer} />
    </Document>
  )
}

function ConjuntoTotalCard({
  label,
  value,
  helper,
  destacado,
}: {
  label: string
  value: string
  helper?: string
  destacado?: boolean
}) {
  return (
    <View style={[s.conjuntoTotalCard, ...(destacado ? [s.conjuntoTotalCardHighlight] : [])]}>
      <Text style={s.conjuntoTotalLabel}>{label}</Text>
      <Text style={[s.conjuntoTotalValue, ...(destacado ? [s.conjuntoTotalValueHighlight] : [])]}>
        {value}
      </Text>
      {helper ? <Text style={s.conjuntoTotalHelper}>{helper}</Text> : null}
    </View>
  )
}

function ConjuntoResumenPage({
  input,
  disclaimer,
}: {
  input: EstudioAhorroConjuntoInput
  disclaimer: string
}) {
  const totales = calcTotalesConjunto(input.estudios)

  return (
    <Page size="A4" style={s.page}>
      <View style={s.headerRow}>
        <View>
          <Image src={getEnersaveLogoPlaceholder()} style={{ width: 100, height: 26 }} />
          <Text style={s.title}>Ahorro conjunto de la cartera</Text>
        </View>
        <Text style={s.fecha}>{input.fechaGeneracion}</Text>
      </View>

      {input.titular ? (
        <View style={s.clienteBox}>
          <Text style={s.clienteText}>
            Titular: {input.titular} · {totales.suministros} suministros analizados
          </Text>
        </View>
      ) : null}

      <View style={s.conjuntoLayout}>
        <View style={s.conjuntoLeft} wrap={false}>
          <Text style={s.sectionTitle}>Ahorro total entre todas las propuestas</Text>

          <View style={s.conjuntoHeroCard}>
            <Text style={s.conjuntoHeroLabel}>Ahorro anual conjunto</Text>
            <Text style={s.conjuntoHeroValue}>{formatEur(totales.ahorroAnualEur)}</Text>
            <Text style={s.conjuntoHeroHelper}>
              {formatNum(totales.ahorroAnualPct, 1)}% sobre el gasto actual ·{" "}
              {totales.suministros} suministros
            </Text>
          </View>

          <ConjuntoTotalCard
            label="Gasto actual anual"
            value={formatEur(totales.gastoActualAnual)}
            helper="Suma de todos los CUPS, base imponible sin IVA"
          />
          <ConjuntoTotalCard
            label="Gasto propuesto anual"
            value={formatEur(totales.gastoPropuestoAnual)}
            helper="Suma de las ofertas seleccionadas, sin IVA"
            destacado
          />
          <ConjuntoTotalCard
            label="Ahorro medio mensual"
            value={formatEur(totales.ahorroAnualEur / 12)}
            helper="Ahorro conjunto repartido en 12 meses"
          />
        </View>

        <View style={s.conjuntoRight}>
          <Text style={s.sectionTitle}>Ahorro por CUPS</Text>
          <View style={s.cupsListHeader}>
            <Text style={[s.cupsListTh, s.cupsCol]}>CUPS</Text>
            <Text style={[s.cupsListTh, s.cupsColAhorro]}>Ahorro anual</Text>
          </View>
          {input.estudios.map((estudio, idx) => (
            <View key={`${estudio.cliente.cups}-${idx}`} style={s.cupsListRow} wrap={false}>
              <View style={s.cupsCol}>
                <Text style={s.cupsCode}>{estudio.cliente.cups}</Text>
                <Text style={s.cupsCliente}>{estudio.cliente.nombre}</Text>
              </View>
              <View style={s.cupsColAhorro}>
                <Text style={s.cupsAhorro}>{formatEur(estudio.ahorroAnualEur)}</Text>
                <Text style={s.cupsAhorroPct}>{formatNum(estudio.ahorroAnualPct, 1)}%</Text>
              </View>
            </View>
          ))}
          <View style={s.cupsListTotalRow}>
            <Text style={[s.cupsListTotalLabel, s.cupsCol]}>TOTAL</Text>
            <Text style={[s.cupsListTotalValue, s.cupsColAhorro]}>
              {formatEur(totales.ahorroAnualEur)}
            </Text>
          </View>
        </View>
      </View>

      <PageFooter disclaimer={disclaimer} />
    </Page>
  )
}

export function EstudioAhorroConjuntoDocument({
  input,
}: {
  input: EstudioAhorroConjuntoInput
}) {
  const disclaimer = buildDisclaimer(input.fechaGeneracion)
  const total = input.estudios.length

  return (
    <Document title="Estudio de Ahorro Conjunto" author="EnerSave">
      {input.estudios.map((estudio, idx) => (
        <EstudioDetallePage
          key={`${estudio.cliente.cups}-${idx}`}
          input={estudio}
          disclaimer={disclaimer}
          indice={{ actual: idx + 1, total }}
        />
      ))}
      <ConjuntoResumenPage input={input} disclaimer={disclaimer} />
    </Document>
  )
}
