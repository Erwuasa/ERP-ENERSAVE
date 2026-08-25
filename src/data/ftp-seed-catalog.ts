import type { FtpNode } from "../types/ftp"

export const FTP_ROOT_LABEL = "FTP común"

export const FTP_OPERATIONS_FOLDER_NAME = "DOCUMENTOS OPERACIONES"

export const FTP_COMPANY_FOLDER_NAMES = [
  "ALARMAS",
  "AXPO",
  "CHC",
  "ENDESA_-GAS_-CDADES",
  "ENDESA_CDAD_PROPIETARIOS_POR_PYME",
  "ENDESA_PYME_POR_CONSUMO",
  "ENDESA_REC_EXPRESS",
  "ENDESA_RESIDENCIAL",
  "FACTOR-ENERGIA",
  "GANA",
  "IBERDROLA_RESIDENCIAL_ATENTE",
  "IGNIS",
  "NATURGY_PYMES_ATENTE",
  "NATURGY_RESIDENCIAL_ATENTE",
  "NIBA",
  "NORDY",
  "OCTOPUS_ENERGY",
  "PROSOL",
  "REPSOL",
  "TELEFONIA",
] as const

const NOW = "2026-01-01T00:00:00.000Z"

export function buildSeedFtpNodes(): FtpNode[] {
  const operationsId = "ftp-documentos-operaciones"
  const nodes: FtpNode[] = [
    {
      id: operationsId,
      parentId: null,
      name: FTP_OPERATIONS_FOLDER_NAME,
      nodeType: "folder",
      source: "enersave",
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]

  for (const name of FTP_COMPANY_FOLDER_NAMES) {
    nodes.push({
      id: `ftp-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      parentId: operationsId,
      name,
      nodeType: "folder",
      source: "enersave",
      createdAt: NOW,
      updatedAt: NOW,
    })
  }

  return nodes
}
