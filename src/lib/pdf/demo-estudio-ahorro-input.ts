import type { EstudioAhorroInput } from "./estudio-ahorro-types"

/** Datos de demostración para generación PDF cuando el mapeo dinámico falla. */
export function getDemoEstudioAhorroInput(
  overrides?: Partial<EstudioAhorroInput["cliente"]>
): EstudioAhorroInput {
  const potencia = [
    { periodo: "P1" as const, potenciaContratadaKw: 4.6, precioEurDia: 0.108, total: 181.42 },
    { periodo: "P2" as const, potenciaContratadaKw: 4.6, precioEurDia: 0.054, total: 90.71 },
    { periodo: "P3" as const, potenciaContratadaKw: 0, precioEurDia: 0, total: 0 },
    { periodo: "P4" as const, potenciaContratadaKw: 0, precioEurDia: 0, total: 0 },
    { periodo: "P5" as const, potenciaContratadaKw: 0, precioEurDia: 0, total: 0 },
    { periodo: "P6" as const, potenciaContratadaKw: 0, precioEurDia: 0, total: 0 },
  ]
  const energiaActual = [
    { periodo: "P1" as const, consumoKwh: 1260, precioEurKwh: 0.178, total: 224.28 },
    { periodo: "P2" as const, consumoKwh: 1050, precioEurKwh: 0.178, total: 186.9 },
    { periodo: "P3" as const, consumoKwh: 1890, precioEurKwh: 0.178, total: 336.42 },
    { periodo: "P4" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
    { periodo: "P5" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
    { periodo: "P6" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
  ]
  const energiaPropuesta = [
    { periodo: "P1" as const, consumoKwh: 1260, precioEurKwh: 0.172, total: 216.72 },
    { periodo: "P2" as const, consumoKwh: 1050, precioEurKwh: 0.172, total: 180.6 },
    { periodo: "P3" as const, consumoKwh: 1890, precioEurKwh: 0.172, total: 325.08 },
    { periodo: "P4" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
    { periodo: "P5" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
    { periodo: "P6" as const, consumoKwh: 0, precioEurKwh: 0, total: 0 },
  ]

  const tarifaActual = {
    comercializadora: "Repsol",
    nombreTarifa: "Luz Fija Hogar",
    terminoPotencia: potencia,
    terminoEnergia: energiaActual,
    otrosConceptos: [{ concepto: "Alquiler equipo", precio: 1.84, total: 22.08 }],
    ivaPct: 21,
    totalFactura: 778.99,
  }
  const tarifaPropuesta = {
    comercializadora: "Factor Energía",
    nombreTarifa: "Factor Luz Hogar",
    terminoPotencia: potencia,
    terminoEnergia: energiaPropuesta,
    otrosConceptos: [{ concepto: "Alquiler equipo", precio: 1.84, total: 22.08 }],
    ivaPct: 21,
    totalFactura: 758.68,
  }

  return {
    cliente: {
      nombre: overrides?.nombre ?? "María López García",
      cups: overrides?.cups ?? "ES0021000000555123AB",
      direccion: overrides?.direccion ?? "Av. Constitución 42, 28012 Madrid",
    },
    fechaGeneracion: new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
    tarifaActual,
    tarifaPropuesta,
    ahorroPorFacturaEur: 20.31,
    ahorroPorFacturaPct: 2.6,
    ahorroAnualEur: 16.8,
    ahorroAnualPct: 2.6,
  }
}
