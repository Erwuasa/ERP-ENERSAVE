export type CashflowScenario = "optimista" | "realista" | "pesimista"

export const CASHFLOW_TIMELINE_ITEMS = [
  { title: "Cobro de comisiones contratos Corporate (Niba)", amount: 14500, date: "01 feb", type: "Operativo", badge: "Confirmado", isPositive: true },
  { title: "Pago a red comercial (Liquidaciones Ene)", amount: -6200, date: "02 feb", type: "Operativo", badge: "Confirmado", isPositive: false },
  { title: "Nóminas equipo de soporte y asesores", amount: -8800, date: "03 feb", type: "Operativo", badge: "Confirmado", isPositive: false },
  { title: "Cobro de mantenimiento de carteras activas", amount: 4200, date: "05 feb", type: "Operativo", badge: "Confirmado", isPositive: true },
  { title: "Provisiones de impuestos Q1 (Agencia Tributaria)", amount: -5300, date: "06 feb", type: "Financiación", badge: "Proyectado", isPositive: false },
  { title: "Cobro leasing de equipos informáticos comerciales", amount: 2600, date: "08 feb", type: "Financiación", badge: "Proyectado", isPositive: true },
  { title: "Adquisición de medidores inteligentes de monitorización", amount: -9300, date: "10 feb", type: "Inversión", badge: "Proyectado", isPositive: false },
  { title: "Cobro contratos PYMES validados por Iberdesa", amount: 7800, date: "12 feb", type: "Operativo", badge: "Proyectado", isPositive: true },
] as const

export type CashflowKpiValues = {
  porPagar: number
  adelantoVivo: number
  pagadoHistorico: number
  porCobrar: number
  proyeccionAcumulada: number
  entradasPrevistas: number
  gastosComisiones: number
}

export function getCashflowKpiValues(scenario: CashflowScenario): CashflowKpiValues {
  if (scenario === "optimista") {
    return {
      porPagar: 12450,
      adelantoVivo: 8900,
      pagadoHistorico: 156800,
      porCobrar: 34500,
      proyeccionAcumulada: 38900,
      entradasPrevistas: 29100,
      gastosComisiones: -29600,
    }
  }
  if (scenario === "pesimista") {
    return {
      porPagar: 24800,
      adelantoVivo: 15600,
      pagadoHistorico: 128900,
      porCobrar: 22100,
      proyeccionAcumulada: 26400,
      entradasPrevistas: 24100,
      gastosComisiones: -32400,
    }
  }
  return {
    porPagar: 18200,
    adelantoVivo: 11200,
    pagadoHistorico: 142300,
    porCobrar: 28900,
    proyeccionAcumulada: 30600,
    entradasPrevistas: 29100,
    gastosComisiones: -29600,
  }
}
