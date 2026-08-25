import type { Contract } from "../../types/contract"
import type { SubtipoProspecto } from "../ventas/types"

/** IDs compartidos entre contratos ERP (estado local) y prospectos Ventas (metadata). */
export const DEMO_SEED_CONTRACT_IDS = {
  panaderia: "con-demo-panaderia",
  taller: "con-demo-taller",
} as const

export interface DemoSyncedProspectoSeed {
  seedKey: string
  nombre: string
  telefono: string
  email: string
  provincia: string
  cups: string
  contratoEquipoId?: string
  fase: string
  subtipoProspecto: SubtipoProspecto
  companiaActual?: string
  tarifaActual?: string
  consumoAnualKwh?: number
}

/** Contratos ERP de demostración vinculados al pipeline Ventas. */
export function buildDemoSyncedContracts(): Contract[] {
  return [
    {
      id: DEMO_SEED_CONTRACT_IDS.panaderia,
      clientName: "Panadería La Estrella SL",
      cups: "ES0021000001112222AB",
      tipo: "luz",
      compania: "Iberdrola",
      tarifa: "Fija Confort",
      atr: "2.0TD",
      consumoAnual: 18500,
      tipoPrecio: "fijo",
      precioFijoConsumo: 0.102,
      potenciaContratada: 6.9,
      nif: "B88234567",
      telefono: "612334455",
      email: "gerencia@laestrella.es",
      iban: "ES12 2100 0813 6101 2345 6789",
      direccionSuministro: "Av. de la Constitución 45, 28014 Madrid",
      provincia: "Madrid",
      codigoPostal: "28014",
      poblacion: "Madrid",
      consumoAnualManual: 18500,
      estado: "PTE DE TRAMITACIÓN",
      comercialId: "usr-3",
      comercialName: "Ignacio Ortiz",
      createdAt: "2026-05-28",
      fechaFin: "2027-05-28",
      estadoRenovacion: "Al día",
      montoInterno: 420,
      montoExterno: 210,
    },
    {
      id: DEMO_SEED_CONTRACT_IDS.taller,
      clientName: "Taller Viesgo Norte",
      cups: "ES0031105542292010LG",
      tipo: "luz",
      compania: "Endesa",
      tarifa: "Indexada Pool",
      atr: "3.0TD",
      consumoAnual: 42000,
      tipoPrecio: "mercado",
      precioFijoConsumo: 0.095,
      potenciaContratada: 15,
      nif: "B11456789",
      telefono: "698776655",
      email: "taller@viesgo.es",
      iban: "ES76 0049 0001 5023 4567 8901",
      direccionSuministro: "Pol. El Rosario, nave 8, 11011 Cádiz",
      provincia: "Cádiz",
      codigoPostal: "11011",
      poblacion: "Cádiz",
      consumoAnualManual: 42000,
      estado: "PTE DE FIRMA",
      comercialId: "usr-3",
      comercialName: "Ignacio Ortiz",
      createdAt: "2026-06-01",
      fechaFin: "2027-06-01",
      estadoRenovacion: "Al día",
      montoInterno: 680,
      montoExterno: 340,
    },
  ]
}

export const DEMO_SYNCED_PROSPECTO_SEEDS: DemoSyncedProspectoSeed[] = [
  {
    seedKey: "demo-panaderia",
    nombre: "Panadería La Estrella SL",
    telefono: "612334455",
    email: "gerencia@laestrella.es",
    provincia: "Madrid",
    cups: "ES0021000001112222AB",
    contratoEquipoId: DEMO_SEED_CONTRACT_IDS.panaderia,
    fase: "tramitacion",
    subtipoProspecto: "vecino_zona",
    companiaActual: "Repsol",
    tarifaActual: "2.0TD fija",
    consumoAnualKwh: 18500,
  },
  {
    seedKey: "demo-taller",
    nombre: "Taller Viesgo Norte",
    telefono: "698776655",
    email: "taller@viesgo.es",
    provincia: "Cádiz",
    cups: "ES0031105542292010LG",
    contratoEquipoId: DEMO_SEED_CONTRACT_IDS.taller,
    fase: "pendiente_firma",
    subtipoProspecto: "contacto_previo",
    companiaActual: "Naturgy",
    tarifaActual: "3.0TD indexada",
    consumoAnualKwh: 42000,
  },
  {
    seedKey: "demo-cafe",
    nombre: "Cafetería Sol y Mar",
    telefono: "655443322",
    email: "info@cafe-solmar.es",
    provincia: "Sevilla",
    cups: "ES0021000000998877CD",
    fase: "cualificado",
    subtipoProspecto: "referido",
    companiaActual: "TotalEnergies",
    consumoAnualKwh: 9200,
  },
]
