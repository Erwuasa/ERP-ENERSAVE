"use server";

export interface ComparePayload {
  segment: "residencial" | "pyme";
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD";
  potencia: {
    p1: number;
    p2: number;
    p3?: number;
    p4?: number;
    p5?: number;
    p6?: number;
  };
  consumo: {
    p1: number;
    p2: number;
    p3: number;
    p4?: number;
    p5?: number;
    p6?: number;
  };
  rentMeterCost?: number;
  /** Total de la factura actual, impuestos incluidos, del mismo periodo que `diasFacturacion`. */
  currentBillAmount?: number;
  diasFacturacion: number;
  reactivaCost?: number;
  /** Coste mensual del SVA. Se prorratea con los días de facturación. */
  svaCost?: number;
  descuentoPotenciaPorcentaje?: number;
  descuentoEnergiaPorcentaje?: number;
  /** Impuesto eléctrico. 5.11 es el tipo habitual si no llega en el payload. */
  porcentajeIEE?: number;
  /** IVA. 21 si no llega en el payload. */
  porcentajeIVA?: number;
}

export interface TariffResult {
  id: string;
  companyName: "EnerLuz" | "Endesa" | "Naturgy" | "Iberdrola" | "TotalEnergies";
  tariffName: string;
  /** Total del periodo facturado, impuestos incluidos. */
  monthlyCost: number;
  /** Mismo importe que `totalPropuesta`. No se anualiza. */
  annualCost: number;
  /** currentBillAmount − totalPropuesta. Puede ser negativo. */
  savingsAnnual: number;
  savingsPercentage: number;
  potenciaBreakdown: number;
  consumoBreakdown: number;
  /** Alquiler prorrateado a los días de facturación. */
  rentCostAnnual: number;
  subtotalPotencia: number;
  subtotalEnergia: number;
  totalIEE: number;
  totalIVA: number;
  totalPropuesta: number;
  isBestOption: boolean;
}

export interface ComparisonResponse {
  success: boolean;
  options: TariffResult[];
  summary: {
    bestTariffName: string;
    bestTariffCompany: string;
    maxAnnualSavings: number;
    maxSavingsPercentage: number;
    /** Total de factura actual contra el que se ha medido el ahorro. */
    currentAnnualExpense: number;
    diasFacturacion: number;
  };
}

interface PricingProfile {
  companyName: "EnerLuz" | "Endesa" | "Naturgy" | "Iberdrola" | "TotalEnergies";
  tariffName: string;
  /** €/kW·día, P1–P6. Los huecos se leen como 0. */
  potenciaRates: number[];
  /** €/kWh, P1–P6. Los huecos se leen como 0. */
  consumoRates: number[];
}

function money(value: number): number {
  return parseFloat(value.toFixed(2));
}

function periodAmounts(values: {
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  p6?: number;
}): number[] {
  return [
    values.p1 || 0,
    values.p2 || 0,
    values.p3 || 0,
    values.p4 || 0,
    values.p5 || 0,
    values.p6 || 0,
  ];
}

function profilesForTariff(accessTariff: ComparePayload["accessTariff"]): PricingProfile[] {
  if (accessTariff === "2.0TD") {
    return [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz Inteligente Indexada",
        potenciaRates: [0.071, 0.022],
        consumoRates: [0.145, 0.125, 0.101],
      },
      {
        companyName: "Iberdrola",
        tariffName: "Iberdrola Plan Estable Luz",
        potenciaRates: [0.082, 0.029],
        consumoRates: [0.178, 0.178, 0.178],
      },
      {
        companyName: "Endesa",
        tariffName: "Endesa One Luz 3 Periodos",
        potenciaRates: [0.079, 0.026],
        consumoRates: [0.165, 0.139, 0.118],
      },
      {
        companyName: "Naturgy",
        tariffName: "Naturgy Tarifa Por Uso",
        potenciaRates: [0.081, 0.027],
        consumoRates: [0.169, 0.149, 0.121],
      },
      {
        companyName: "TotalEnergies",
        tariffName: "TotalEnergies Ahorro Luz",
        potenciaRates: [0.08, 0.025],
        consumoRates: [0.162, 0.135, 0.114],
      },
    ];
  }

  if (accessTariff === "3.0TD") {
    return [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz MultiPYME Indexada 6P",
        potenciaRates: [0.102, 0.085, 0.045, 0.038, 0.022, 0.015],
        consumoRates: [0.129, 0.118, 0.105, 0.098, 0.091, 0.082],
      },
      {
        companyName: "Endesa",
        tariffName: "Endesa Negocio Fórmula Variable",
        potenciaRates: [0.115, 0.095, 0.052, 0.044, 0.028, 0.018],
        consumoRates: [0.149, 0.138, 0.122, 0.115, 0.108, 0.095],
      },
      {
        companyName: "Iberdrola",
        tariffName: "Iberdrola Plan 3 Grabaciones PYME",
        potenciaRates: [0.119, 0.098, 0.055, 0.045, 0.029, 0.019],
        consumoRates: [0.155, 0.141, 0.128, 0.119, 0.112, 0.099],
      },
      {
        companyName: "Naturgy",
        tariffName: "Naturgy Maxima Empresa Fija",
        potenciaRates: [0.112, 0.092, 0.051, 0.042, 0.027, 0.017],
        consumoRates: [0.144, 0.134, 0.119, 0.112, 0.104, 0.091],
      },
    ];
  }

  return [
    {
      companyName: "EnerLuz",
      tariffName: "EnerLuz Industrial Pool Max 6.0",
      potenciaRates: [0.095, 0.078, 0.042, 0.034, 0.019, 0.012],
      consumoRates: [0.111, 0.099, 0.092, 0.085, 0.078, 0.069],
    },
    {
      companyName: "Iberdrola",
      tariffName: "Iberdrola Alta Tensión a Medida",
      potenciaRates: [0.112, 0.091, 0.049, 0.041, 0.024, 0.016],
      consumoRates: [0.132, 0.119, 0.109, 0.102, 0.094, 0.084],
    },
    {
      companyName: "Naturgy",
      tariffName: "Naturgy Gas & Luz Industrial Alianza",
      potenciaRates: [0.106, 0.086, 0.046, 0.038, 0.022, 0.014],
      consumoRates: [0.125, 0.112, 0.103, 0.096, 0.088, 0.078],
    },
  ];
}

/**
 * Compara la factura del periodo con las tarifas de ejemplo.
 * El total de cada oferta sigue el orden potencia → energía → descuentos → IEE → alquiler y SVA → IVA.
 */
export async function compareTariffs(payload: ComparePayload): Promise<ComparisonResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const {
    accessTariff,
    potencia,
    consumo,
    rentMeterCost = 1.84,
    currentBillAmount = 0,
    diasFacturacion,
    reactivaCost = 0,
    svaCost = 0,
    descuentoPotenciaPorcentaje = 0,
    descuentoEnergiaPorcentaje = 0,
    porcentajeIEE = 5.11,
    porcentajeIVA = 21,
  } = payload;

  const days = diasFacturacion > 0 ? diasFacturacion : 30;
  const powers = periodAmounts(potencia);
  const energies = periodAmounts(consumo);
  const profiles = profilesForTariff(accessTariff);
  const powerDiscount = 1 - descuentoPotenciaPorcentaje / 100;
  const energyDiscount = 1 - descuentoEnergiaPorcentaje / 100;

  const calculatedOptions: TariffResult[] = profiles.map((prof, index) => {
    let costePotencia = 0;
    let costeEnergia = 0;

    for (let period = 0; period < 6; period += 1) {
      costePotencia += (powers[period] || 0) * (prof.potenciaRates[period] || 0) * days;
      costeEnergia += (energies[period] || 0) * (prof.consumoRates[period] || 0);
    }

    const subtotalPotencia = costePotencia * powerDiscount;
    const subtotalEnergia = costeEnergia * energyDiscount;
    const baseIee = subtotalPotencia + subtotalEnergia + (reactivaCost || 0);
    const totalIEE = baseIee * (porcentajeIEE / 100);
    const totalAlquiler = (rentMeterCost / 30) * days;
    const totalSva = ((svaCost || 0) / 30) * days;
    const baseIva = baseIee + totalIEE + totalAlquiler + totalSva;
    const totalIVA = baseIva * (porcentajeIVA / 100);
    const totalPropuesta = baseIva + totalIVA;

    return {
      id: `tariff-${prof.companyName.toLowerCase()}-${index}`,
      companyName: prof.companyName,
      tariffName: prof.tariffName,
      monthlyCost: money(totalPropuesta),
      annualCost: money(totalPropuesta),
      savingsAnnual: 0,
      savingsPercentage: 0,
      potenciaBreakdown: money(subtotalPotencia),
      consumoBreakdown: money(subtotalEnergia),
      rentCostAnnual: money(totalAlquiler),
      subtotalPotencia: money(subtotalPotencia),
      subtotalEnergia: money(subtotalEnergia),
      totalIEE: money(totalIEE),
      totalIVA: money(totalIVA),
      totalPropuesta: money(totalPropuesta),
      isBestOption: false,
    };
  });

  const bill = currentBillAmount > 0 ? currentBillAmount : 0;
  const optionsWithSavings = calculatedOptions.map((opt) => {
    const ahorroAbsoluto = bill > 0 ? bill - opt.totalPropuesta : 0;
    const ahorroPorcentaje = bill > 0 ? (ahorroAbsoluto / bill) * 100 : 0;
    return {
      ...opt,
      savingsAnnual: money(ahorroAbsoluto),
      savingsPercentage: money(ahorroPorcentaje),
    };
  });

  optionsWithSavings.sort((a, b) => a.totalPropuesta - b.totalPropuesta);
  const top3Options = optionsWithSavings.slice(0, 3).map((opt, index) => ({
    ...opt,
    isBestOption: index === 0,
  }));
  const bestOption = top3Options[0];

  return {
    success: true,
    options: top3Options,
    summary: {
      bestTariffName: bestOption?.tariffName ?? "",
      bestTariffCompany: bestOption?.companyName ?? "",
      maxAnnualSavings: bestOption?.savingsAnnual ?? 0,
      maxSavingsPercentage: bestOption?.savingsPercentage ?? 0,
      currentAnnualExpense: money(bill),
      diasFacturacion: days,
    },
  };
}
