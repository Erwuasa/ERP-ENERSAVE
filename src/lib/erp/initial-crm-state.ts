import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"

/** ERP arranca vacío: sin clientes ni contratos demo. Los datos vienen de Supabase o altas manuales. */
export const INITIAL_CRM: { clients: Client[]; contracts: Contract[] } = {
  clients: [],
  contracts: [],
}
