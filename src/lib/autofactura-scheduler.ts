export type AutofacturaTipoCliente = "residencial" | "pyme"

export interface AutofacturaPeriodo {
  mes: number
  año: number
}

const AUTOFACTURA_DIA_RESIDENCIAL = 6
const AUTOFACTURA_DIA_PYME = 20

function getAutofacturaTargetDay(tipoCliente: AutofacturaTipoCliente): number {
  return tipoCliente === "pyme" ? AUTOFACTURA_DIA_PYME : AUTOFACTURA_DIA_RESIDENCIAL
}

/** Fecha de emisión de autofactura más reciente ya alcanzada (día 6 o 20). */
export function getLatestAutofacturaEmisionDate(
  tipoCliente: AutofacturaTipoCliente,
  hoy: Date = new Date()
): Date {
  const targetDay = getAutofacturaTargetDay(tipoCliente)
  const year = hoy.getFullYear()
  const month = hoy.getMonth()

  if (hoy.getDate() >= targetDay) {
    return new Date(year, month, targetDay)
  }

  return new Date(year, month - 1, targetDay)
}

/** Mes calendario de activaciones asociado a la última fecha de emisión alcanzada. */
export function getAutofacturaPeriodoFacturacion(
  tipoCliente: AutofacturaTipoCliente,
  hoy: Date = new Date()
): AutofacturaPeriodo {
  const emision = getLatestAutofacturaEmisionDate(tipoCliente, hoy)
  const periodStart = new Date(emision.getFullYear(), emision.getMonth() - 1, 1)
  return {
    mes: periodStart.getMonth() + 1,
    año: periodStart.getFullYear(),
  }
}

/** Día 6 del mes siguiente (residencial) o día 20 (pyme). */
export function getProximaFechaAutofactura(
  tipoCliente: AutofacturaTipoCliente,
  hoy: Date = new Date()
): Date {
  const year = hoy.getFullYear()
  const month = hoy.getMonth()
  const targetDay =
    tipoCliente === "pyme" ? AUTOFACTURA_DIA_PYME : AUTOFACTURA_DIA_RESIDENCIAL

  return new Date(year, month + 1, targetDay)
}

export function formatAutofacturaFecha(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
