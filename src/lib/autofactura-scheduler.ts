export type AutofacturaTipoCliente = "residencial" | "pyme"

const AUTOFACTURA_DIA_RESIDENCIAL = 6
const AUTOFACTURA_DIA_PYME = 20

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
