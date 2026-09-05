export const CONTRATO_DETALLE_TABS = [
  { id: "incidencias", label: "Incidencias" },
  { id: "contrato", label: "Contrato" },
  { id: "cliente", label: "Cliente" },
  { id: "suministro", label: "Suministro" },
  { id: "tarifa_marco", label: "Tarifa y marco" },
  { id: "comisiones", label: "Comisiones" },
  { id: "fechas", label: "Fechas del contrato" },
  { id: "documentos", label: "Documentos" },
  { id: "historial", label: "Historial" },
] as const

export type ContratoDetalleTab = (typeof CONTRATO_DETALLE_TABS)[number]["id"]

export function formatContractDisplayId(contractId: string): string {
  return contractId.replace(/-/g, "").slice(0, 8).toUpperCase()
}
