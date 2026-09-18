export const AT_API_DISABLED_TITLE = "API AT apagada"

const DEFAULT_MESSAGE =
  "FTP, tarifas, marcos, comparador y el resto de llamadas a AT están pausadas. El ERP sigue con la última copia local."

const BY_TAB: Record<string, string> = {
  FTP: "El archivo de AT no se consulta. Solo está disponible el FTP local de EnerSave.",
  Tarifas: "Las tarifas no se actualizan desde AT. Se muestra la última copia guardada en el ERP.",
  "Marco Retributivo":
    "Los marcos no se sincronizan con AT. Se muestra la última copia guardada en el ERP.",
  Comparador: "El comparador no refresca tarifas ni marcos desde AT. Usa la copia local del ERP.",
  "Comparador de Facturas":
    "El comparador no refresca tarifas ni marcos desde AT. Usa la copia local del ERP.",
  "Historial de Comparativas": "Las comparativas de AT no se refrescan mientras la API está apagada.",
  Comunicaciones: "Los avisos de email de AT no se sincronizan mientras la API está apagada.",
  Contratos: "Los contratos no se envían ni se actualizan en AT. El alta queda solo en el ERP.",
  "Mis Contratos": "Los contratos no se envían ni se actualizan en AT. El alta queda solo en el ERP.",
  "Mis Clientes": "Los clientes no se sincronizan con AT. Se muestra la última copia guardada en el ERP.",
  "Nuevo contrato": "El alta no se envía a AT. El contrato queda solo en el ERP.",
  Incidencias: "Las incidencias de AT no se sincronizan mientras la API está apagada.",
  "Liquidaciones internas": "Las liquidaciones de AT no se refrescan mientras la API está apagada.",
  "Liquidaciones externas": "Las liquidaciones de AT no se refrescan mientras la API está apagada.",
}

export function resolveAtApiDisabledMessage(tab?: string): string {
  if (!tab) return DEFAULT_MESSAGE
  return BY_TAB[tab] ?? DEFAULT_MESSAGE
}
