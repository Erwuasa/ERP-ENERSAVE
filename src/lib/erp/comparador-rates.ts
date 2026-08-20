export type ComparadorAccessTariff = "2.0TD" | "3.0TD" | "6.0TD"

export interface ComparadorPeriodValues {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
}

export interface ComparadorRateInput {
  accessTariff: ComparadorAccessTariff
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  rentMeter: number
  currentBill: number
}

export interface ComparadorRateOption {
  id: string
  companyName: string
  tariffName: string
  monthlyCost: number
  annualCost: number
  potenciaBreakdown: number
  consumoBreakdown: number
  rentCostAnnual: number
  isBestOption: boolean
  savingsAnnual: number
  savingsPercentage: number
}

export interface ComparadorRateSummary {
  bestTariffName: string
  bestTariffCompany: string
  maxAnnualSavings: number
  maxSavingsPercentage: number
  currentAnnualExpense: number
}

interface SetupTariff {
  companyName: string
  tariffName: string
  potRates: number[]
  conRates: number[]
}

function profilesForTariff(accessTariff: ComparadorAccessTariff): SetupTariff[] {
  if (accessTariff === "2.0TD") {
    return [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz Inteligente Indexada",
        potRates: [0.071, 0.022],
        conRates: [0.145, 0.125, 0.101],
      },
      {
        companyName: "Iberdrola",
        tariffName: "Iberdrola Plan Estable Luz",
        potRates: [0.082, 0.029],
        conRates: [0.178, 0.178, 0.178],
      },
      {
        companyName: "Endesa",
        tariffName: "Endesa One Luz 3 Periodos",
        potRates: [0.079, 0.026],
        conRates: [0.165, 0.139, 0.118],
      },
      {
        companyName: "Naturgy",
        tariffName: "Naturgy Tarifa Por Uso",
        potRates: [0.081, 0.027],
        conRates: [0.169, 0.149, 0.121],
      },
    ]
  }

  if (accessTariff === "3.0TD") {
    return [
      {
        companyName: "EnerLuz",
        tariffName: "EnerLuz MultiPYME Indexada 6P",
        potRates: [0.102, 0.085, 0.045, 0.038, 0.022, 0.015],
        conRates: [0.129, 0.118, 0.105, 0.098, 0.091, 0.082],
      },
      {
        companyName: "Endesa",
        tariffName: "Endesa Negocio Fórmula Variable",
        potRates: [0.115, 0.095, 0.052, 0.044, 0.028, 0.018],
        conRates: [0.149, 0.138, 0.122, 0.115, 0.108, 0.095],
      },
      {
        companyName: "Iberdrola",
        tariffName: "Iberdrola Plan 3 Grabaciones PYME",
        potRates: [0.119, 0.098, 0.055, 0.045, 0.029, 0.019],
        conRates: [0.155, 0.141, 0.128, 0.119, 0.112, 0.099],
      },
    ]
  }

  return [
    {
      companyName: "EnerLuz",
      tariffName: "EnerLuz Industrial Pool Max 6.0",
      potRates: [0.095, 0.078, 0.042, 0.034, 0.019, 0.012],
      conRates: [0.111, 0.099, 0.092, 0.085, 0.078, 0.069],
    },
    {
      companyName: "Iberdrola",
      tariffName: "Iberdrola Alta Tensión a Medida",
      potRates: [0.112, 0.091, 0.049, 0.041, 0.024, 0.016],
      conRates: [0.132, 0.119, 0.109, 0.102, 0.094, 0.084],
    },
    {
      companyName: "Naturgy",
      tariffName: "Naturgy Gas & Luz Industrial Alianza",
      potRates: [0.106, 0.086, 0.046, 0.038, 0.022, 0.014],
      conRates: [0.125, 0.112, 0.103, 0.096, 0.088, 0.078],
    },
  ]
}

export function computeComparadorRates(
  input: ComparadorRateInput
): { results: ComparadorRateOption[]; summary: ComparadorRateSummary } {
  const daysInYear = 365
  const meterCostAnnual = Number(input.rentMeter) * 12
  const testProfiles = profilesForTariff(input.accessTariff)

  const calculatedOptions = testProfiles.map((prof, idx) => {
    let potCost = 0
    let conCost = 0
    const { potencias: compPotencias, consumos: compConsumos } = input

    if (input.accessTariff === "2.0TD") {
      potCost =
        Number(compPotencias.p1 || 0) * prof.potRates[0] * daysInYear +
        Number(compPotencias.p2 || 0) * prof.potRates[1] * daysInYear

      conCost =
        Number(compConsumos.p1 || 0) * prof.conRates[0] +
        Number(compConsumos.p2 || 0) * prof.conRates[1] +
        Number(compConsumos.p3 || 0) * prof.conRates[2]
    } else {
      potCost =
        Number(compPotencias.p1 || 0) * prof.potRates[0] * daysInYear +
        Number(compPotencias.p2 || 0) * prof.potRates[1] * daysInYear +
        Number(compPotencias.p3 || 0) * (prof.potRates[2] || 0) * daysInYear +
        Number(compPotencias.p4 || 0) * (prof.potRates[3] || 0) * daysInYear +
        Number(compPotencias.p5 || 0) * (prof.potRates[4] || 0) * daysInYear +
        Number(compPotencias.p6 || 0) * (prof.potRates[5] || 0) * daysInYear

      conCost =
        Number(compConsumos.p1 || 0) * prof.conRates[0] +
        Number(compConsumos.p2 || 0) * prof.conRates[1] +
        Number(compConsumos.p3 || 0) * prof.conRates[2] +
        Number(compConsumos.p4 || 0) * (prof.conRates[3] || 0) +
        Number(compConsumos.p5 || 0) * (prof.conRates[4] || 0) +
        Number(compConsumos.p6 || 0) * (prof.conRates[5] || 0)
    }

    const annualCost = potCost + conCost + meterCostAnnual
    const monthlyCost = annualCost / 12

    return {
      id: `client-tariff-${prof.companyName.toLowerCase()}-${idx}`,
      companyName: prof.companyName,
      tariffName: prof.tariffName,
      monthlyCost: Math.round(monthlyCost),
      annualCost: Math.round(annualCost),
      potenciaBreakdown: Math.round(potCost),
      consumoBreakdown: Math.round(conCost),
      rentCostAnnual: Math.round(meterCostAnnual),
      isBestOption: prof.companyName === "EnerLuz",
      savingsAnnual: 0,
      savingsPercentage: 0,
    }
  })

  let currentAnnualExpense = 0
  if (input.currentBill && Number(input.currentBill) > 0) {
    currentAnnualExpense = Number(input.currentBill) * 12
  } else {
    const maxVal = Math.max(...calculatedOptions.map((o) => o.annualCost))
    currentAnnualExpense = maxVal * 1.18
  }

  const finalOptions = calculatedOptions
    .map((opt) => {
      const savingsAnnual = Math.max(0, currentAnnualExpense - opt.annualCost)
      const savingsPercentage = Math.round((savingsAnnual / currentAnnualExpense) * 100)
      return {
        ...opt,
        savingsAnnual: Math.round(savingsAnnual),
        savingsPercentage,
      }
    })
    .sort((a, b) => a.annualCost - b.annualCost)

  const topOptions = finalOptions.slice(0, 3)
  const best = topOptions.find((o) => o.companyName === "EnerLuz") || topOptions[0]

  return {
    results: topOptions,
    summary: {
      bestTariffName: best.tariffName,
      bestTariffCompany: best.companyName,
      maxAnnualSavings: best.savingsAnnual,
      maxSavingsPercentage: best.savingsPercentage,
      currentAnnualExpense: Math.round(currentAnnualExpense),
    },
  }
}
