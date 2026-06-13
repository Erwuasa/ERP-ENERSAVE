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
  currentBillAmount?: number;
}

export interface TariffResult {
  id: string;
  companyName: "EnerLuz" | "Endesa" | "Naturgy" | "Iberdrola" | "TotalEnergies";
  tariffName: string;
  monthlyCost: number;
  annualCost: number;
  savingsAnnual: number;
  savingsPercentage: number;
  potenciaBreakdown: number;
  consumoBreakdown: number;
  rentCostAnnual: number;
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
    currentAnnualExpense: number;
  };
}

/**
 * Server Action in Next.js 14 to compare client utility data against major Spanish energy retail options.
 * Computes exact period costs (P1-P3 or P1-P6) depending on access rate.
 */
export async function compareTariffs(payload: ComparePayload): Promise<ComparisonResponse> {
  // Simulate database fetching latency (e.g. 500ms API retrieval)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const {
    segment,
    accessTariff,
    potencia,
    consumo,
    rentMeterCost = 1.84, // Default standard monthly rent cost
    currentBillAmount,
  } = payload;

  const daysInYear = 365;
  const meterCostAnnual = rentMeterCost * 12;

  // Exact period multipliers to determine proposed rates
  // Our brand "EnerLuz Optima" vs Competitors (Iberdrola, Endesa, Naturgy, etc.)
  interface PricingProfile {
    companyName: "EnerLuz" | "Endesa" | "Naturgy" | "Iberdrola" | "TotalEnergies";
    tariffName: string;
    // Potencia cost per kW per day (€/kW-dia)
    potenciaRates: number[];
    // Consumo cost per kWh (€/kWh)
    consumoRates: number[];
  }

  // Define database tariffs based on selected access rate
  let profiles: PricingProfile[] = [];

  if (accessTariff === "2.0TD") {
    profiles = [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz Inteligente Indexada",
        potenciaRates: [0.071, 0.022], // P1, P2
        consumoRates: [0.145, 0.125, 0.101], // P1, P2, P3
      },
      {
        companyName: "Iberdrola",
        tariffName: "Iberdrola Plan Estable Luz",
        potenciaRates: [0.082, 0.029],
        consumoRates: [0.178, 0.178, 0.178], // Fixed flat rate
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
        potenciaRates: [0.080, 0.025],
        consumoRates: [0.162, 0.135, 0.114],
      },
    ];
  } else if (accessTariff === "3.0TD") {
    // 3.0TD is for >15kW, common in small/medium PYMEs. 6 periods
    profiles = [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz MultiPYME Indexada 6P",
        potenciaRates: [0.102, 0.085, 0.045, 0.038, 0.022, 0.015], // P1 to P6
        consumoRates: [0.129, 0.118, 0.105, 0.098, 0.091, 0.082], // P1 to P6
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
  } else {
    // 6.0TD - Industrial / Large business high voltage (P1 to P6)
    profiles = [
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

  // Calculate annual consumption across periods
  const c1 = consumo.p1 || 0;
  const c2 = consumo.p2 || 0;
  const c3 = consumo.p3 || 0;
  const c4 = consumo.p4 || 0;
  const c5 = consumo.p5 || 0;
  const c6 = consumo.p6 || 0;

  // Calculate chosen contracted capacity (potencia)
  const pot1 = potencia.p1 || 0;
  const pot2 = potencia.p2 || 0;
  const pot3 = potencia.p3 || 0;
  const pot4 = potencia.p4 || 0;
  const pot5 = potencia.p5 || 0;
  const pot6 = potencia.p6 || 0;

  // Let's compute calculated costs under each profile
  const calculatedOptions: TariffResult[] = profiles.map((prof, index) => {
    let potenciaCost = 0;
    let consumoCost = 0;

    if (accessTariff === "2.0TD") {
      // Potencia: P1 and P2
      potenciaCost =
        pot1 * prof.potenciaRates[0] * daysInYear +
        pot2 * prof.potenciaRates[1] * daysInYear;

      // Consumo: P1, P2, and P3
      consumoCost =
        c1 * prof.consumoRates[0] +
        c2 * prof.consumoRates[1] +
        c3 * prof.consumoRates[2];
    } else {
      // 3.0TD & 6.0TD use up to 6 periods
      potenciaCost =
        pot1 * prof.potenciaRates[0] * daysInYear +
        pot2 * prof.potenciaRates[1] * daysInYear +
        pot3 * (prof.potenciaRates[2] || 0) * daysInYear +
        pot4 * (prof.potenciaRates[3] || 0) * daysInYear +
        pot5 * (prof.potenciaRates[4] || 0) * daysInYear +
        pot6 * (prof.potenciaRates[5] || 0) * daysInYear;

      consumoCost =
        c1 * prof.consumoRates[0] +
        c2 * prof.consumoRates[1] +
        c3 * prof.consumoRates[2] +
        c4 * (prof.consumoRates[3] || 0) +
        c5 * (prof.consumoRates[4] || 0) +
        c6 * (prof.consumoRates[5] || 0);
    }

    const annualCost = potenciaCost + consumoCost + meterCostAnnual;
    const monthlyCost = annualCost / 12;

    return {
      id: `tariff-${prof.companyName.toLowerCase()}-${index}`,
      companyName: prof.companyName,
      tariffName: prof.tariffName,
      monthlyCost: parseFloat(monthlyCost.toFixed(2)),
      annualCost: parseFloat(annualCost.toFixed(2)),
      savingsAnnual: 0, // Calculated relatively
      savingsPercentage: 0, // Calculated relatively
      potenciaBreakdown: parseFloat(potenciaCost.toFixed(2)),
      consumoBreakdown: parseFloat(consumoCost.toFixed(2)),
      rentCostAnnual: parseFloat(meterCostAnnual.toFixed(2)),
      isBestOption: prof.companyName === "EnerLuz",
    };
  });

  // Decide what current annual expense we compare against
  let currentAnnualExpense = 0;

  if (currentBillAmount && currentBillAmount > 0) {
    // Imported current bill behaves as MONTHLY cost
    currentAnnualExpense = currentBillAmount * 12;
  } else {
    // If no current bill is provided, we simulate that their current bill
    // is with an expensive legacy supplier which is about 22% more expensive than the worst competitor option here.
    const worstCompetitorAnnual = Math.max(...calculatedOptions.map(o => o.annualCost));
    currentAnnualExpense = worstCompetitorAnnual * 1.18;
  }

  // Refine savings calculations for each option based on current expense
  const optionsWithSavings = calculatedOptions.map((opt) => {
    const savingsAnnual = Math.max(0, currentAnnualExpense - opt.annualCost);
    const savingsPercentage = (savingsAnnual / currentAnnualExpense) * 100;

    return {
      ...opt,
      savingsAnnual: parseFloat(savingsAnnual.toFixed(2)),
      savingsPercentage: parseFloat(savingsPercentage.toFixed(2)),
    };
  });

  // Sort by cost: best (cheapest) first
  optionsWithSavings.sort((a, b) => a.annualCost - b.annualCost);

  // Return the best 3 options
  const top3Options = optionsWithSavings.slice(0, 3);

  // Ensure our brand "EnerLuz" is always flagged as best option if present in the top 3
  const bestOption = top3Options.find((o) => o.companyName === "EnerLuz") || top3Options[0];

  return {
    success: true,
    options: top3Options,
    summary: {
      bestTariffName: bestOption.tariffName,
      bestTariffCompany: bestOption.companyName,
      maxAnnualSavings: bestOption.savingsAnnual,
      maxSavingsPercentage: bestOption.savingsPercentage,
      currentAnnualExpense: parseFloat(currentAnnualExpense.toFixed(2)),
    },
  };
}
