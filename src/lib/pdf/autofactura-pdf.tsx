import { pdf } from "@react-pdf/renderer"
import { AutofacturaDocument, type AutofacturaPdfInput } from "./autofactura-document"
import type { ErpComercial } from "../../types/erp-comercial"
import type { LiquidacionMensual } from "../liquidaciones-mensuales"

export type { AutofacturaPdfInput } from "./autofactura-document"

export interface GenerateAutofacturaPdfOptions {
  mes: number
  año: number
  ivaPct?: number
  proximaFechaEmisionLabel?: string
}

export async function generateAutofacturaPdf(
  comercial: ErpComercial,
  liquidacion: LiquidacionMensual,
  options: GenerateAutofacturaPdfOptions
): Promise<Blob> {
  const input: AutofacturaPdfInput = {
    comercial,
    liquidacion,
    mes: options.mes,
    año: options.año,
    ivaPct: options.ivaPct,
    proximaFechaEmisionLabel: options.proximaFechaEmisionLabel,
  }
  const instance = pdf(<AutofacturaDocument input={input} />)
  return instance.toBlob()
}

export function downloadAutofacturaPdf(blob: Blob, comercialName: string, mes: number, año: number): void {
  const safeName = (comercialName || "comercial")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  const mesLabel = String(mes).padStart(2, "0")
  const filename = `autofactura-${safeName || "comercial"}-${mesLabel}-${año}.pdf`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
