import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import { buildClientsFromContracts, linkContractsToClients } from "@/lib/clients"
import { buildDemoSyncedContracts } from "@/lib/demo/synced-ventas-erp-seed"

const SEED_CONTRACTS: Contract[] = [
  {
    id: "con-1",
    clientName: "ANA MARIA PINEDA BARRAGA",
    cups: "ES0031102370432011GL",
    tipo: "luz",
    compania: "Iberdrola",
    tarifa: "Fijo",
    atr: "2.0TD",
    consumoAnual: 4200,
    tipoPrecio: "fijo",
    precioFijoConsumo: 0.118,
    potenciaContratada: 4.6,
    nif: "12345678A",
    telefono: "600111222",
    email: "ana.pineda@email.com",
    iban: "ES91 2100 0418 4502 0005 1332",
    direccionSuministro: "C/ Mayor 12, 28013 Madrid",
    consumoAnualManual: 4200,
    estado: "Activado",
    comercialId: "usr-3",
    comercialName: "Jose Antonio Acal Franco",
    createdAt: "2025-04-07",
    fechaFin: "2026-04-07",
    estadoRenovacion: "Renovacion proxima",
    fechaRenovacion: "2026-04-07",
    diasRenovacion: 69,
    montoInterno: 240,
    montoExterno: 120,
  },
  {
    id: "con-2",
    clientName: "GEA CATERING, S.L.",
    cups: "ES0021000002359672001KF",
    tipo: "luz",
    compania: "Endesa",
    tarifa: "Fijo",
    atr: "2.0TD",
    consumoAnual: 18420,
    tipoPrecio: "fijo",
    precioFijoConsumo: 0.105,
    potenciaContratada: 9.2,
    nif: "B12345678",
    telefono: "963111222",
    email: "admin@geacatering.es",
    iban: "ES80 2310 0001 1800 0001 2345",
    direccionSuministro: "Pol. Ind. Norte, nave 4, 46015 Valencia",
    consumoAnualManual: 18420,
    estado: "Activado",
    comercialId: "usr-3",
    comercialName: "Jose Antonio Acal Franco",
    createdAt: "2025-04-14",
    fechaFin: "2026-04-14",
    estadoRenovacion: "Renovacion proxima",
    fechaRenovacion: "2026-04-14",
    diasRenovacion: 76,
    montoInterno: 380,
    montoExterno: 190,
  },
  ...buildDemoSyncedContracts(),
]

export function createInitialCrmState() {
  const clients = buildClientsFromContracts(SEED_CONTRACTS)
  const contracts = linkContractsToClients(SEED_CONTRACTS, clients)
  return { clients, contracts }
}

export const INITIAL_CRM = createInitialCrmState()

export type ErpCrmState = {
  clients: Client[]
  contracts: Contract[]
}
