import { Document, Page, Text, View } from "@react-pdf/renderer"
import { BRAND, pdfStyles as s } from "./estudio-ahorro-styles"
import type { ErpComercial } from "../../types/erp-comercial"
import type { LiquidacionMensual } from "../liquidaciones-mensuales"

export interface AutofacturaPdfInput {
  comercial: ErpComercial
  liquidacion: LiquidacionMensual
  mes: number
  año: number
  ivaPct?: number
  proximaFechaEmisionLabel?: string
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function monthLabel(mes: number, año: number): string {
  const date = new Date(año, mes - 1, 1)
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}

export function AutofacturaDocument({ input }: { input: AutofacturaPdfInput }) {
  const ivaPct = input.ivaPct ?? 21
  const baseImponible = input.liquidacion.totalComisionado
  const iva = Math.round(baseImponible * (ivaPct / 100) * 100) / 100
  const total = Math.round((baseImponible + iva) * 100) / 100
  const periodo = monthLabel(input.mes, input.año)
  const emitida = new Date().toLocaleDateString("es-ES")

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={{ fontSize: 10, fontFamily: "SF Pro Display", fontWeight: "bold", color: BRAND.verde }}>
              ENERSAVE
            </Text>
            <Text style={s.title}>Autofactura de comisiones</Text>
            <Text style={{ fontSize: 8, color: BRAND.gris, marginTop: 2 }}>
              Periodo liquidado: {periodo}
            </Text>
          </View>
          <View>
            <Text style={s.fecha}>Emitida: {emitida}</Text>
            {input.proximaFechaEmisionLabel ? (
              <Text style={[s.fecha, { marginTop: 4 }]}>
                Próxima fecha sugerida: {input.proximaFechaEmisionLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.clienteBox}>
          <Text style={s.sectionTitle}>Datos fiscales del comercial</Text>
          <Text style={s.clienteText}>{input.comercial.fullName}</Text>
          <Text style={s.clienteText}>DNI/NIF: {input.comercial.dni}</Text>
          <Text style={s.clienteText}>{input.comercial.direccion}</Text>
          <Text style={s.clienteText}>
            {input.comercial.codigoPostal} {input.comercial.ciudad}
          </Text>
          <Text style={s.clienteText}>Tel: {input.comercial.telefono}</Text>
          <Text style={s.clienteText}>Email: {input.comercial.email}</Text>
          <Text style={s.clienteText}>IBAN: {input.comercial.iban}</Text>
        </View>

        <Text style={s.sectionTitle}>Desglose de comisiones</Text>
        <View style={s.block}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: "28%" }]}>Cliente</Text>
            <Text style={[s.th, { width: "24%" }]}>CUPS</Text>
            <Text style={[s.th, { width: "12%", textAlign: "right" }]}>Activación</Text>
            <Text style={[s.th, { width: "18%", textAlign: "right" }]}>Bruto</Text>
            <Text style={[s.th, { width: "18%", textAlign: "right" }]}>Comisión</Text>
          </View>
          {input.liquidacion.desglosePorContrato.map((line) => (
            <View key={line.contractId} style={s.tableRow}>
              <Text style={[s.td, { width: "28%" }]}>{line.clientName}</Text>
              <Text style={[s.td, { width: "24%", fontSize: 6 }]}>{line.cups}</Text>
              <Text style={[s.td, { width: "12%", textAlign: "right" }]}>
                {line.fechaActivacion.split("-").reverse().join("/")}
              </Text>
              <Text style={[s.td, { width: "18%", textAlign: "right" }]}>
                {formatEur(line.comisionBruta)}
              </Text>
              <Text style={[s.td, { width: "18%", textAlign: "right" }]}>
                {formatEur(line.comisionComercial)}
              </Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total comisiones del periodo</Text>
            <Text style={[s.totalLabel, { color: BRAND.verde }]}>
              {formatEur(input.liquidacion.totalComisionado)}
            </Text>
          </View>
        </View>

        <View style={[s.invoiceCardsRow, { marginTop: 16 }]}>
          <View style={s.invoiceCard}>
            <Text style={s.conjuntoTotalLabel}>Base imponible</Text>
            <Text style={s.conjuntoTotalValue}>{formatEur(baseImponible)}</Text>
          </View>
          <View style={s.invoiceCard}>
            <Text style={s.conjuntoTotalLabel}>IVA ({ivaPct}%)</Text>
            <Text style={s.conjuntoTotalValue}>{formatEur(iva)}</Text>
          </View>
          <View style={[s.invoiceCard, s.invoiceCardPropuesta]}>
            <Text style={s.conjuntoTotalLabel}>Total autofactura</Text>
            <Text style={[s.conjuntoTotalValue, { color: BRAND.verde }]}>
              {formatEur(total)}
            </Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>
            Documento generado automáticamente por EnerSave ERP. El comercial emite esta autofactura
            por las comisiones devengadas en el periodo indicado.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
