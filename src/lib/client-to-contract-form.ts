import type { Client } from "@/types/client"
import type { ContratoDocumentoArchivo, NewContractFormState } from "@/lib/contract-registration"

function identityArchivosFromClient(client: Client): ContratoDocumentoArchivo[] {
  return (client.archivos ?? [])
    .filter((a) => a.name && (a.dataUrl || a.storagePath))
    .map((a) => ({
      name: a.name,
      size: `${Math.max(1, Math.round(a.size / 1024))} KB`,
      uploadedAt: a.uploadedAt,
      dataUrl: a.dataUrl || undefined,
    }))
}

export function buildNewContractFormPatchFromClient(
  client: Client,
  opts: { nombreComercial: string; jefeEquipo: string }
): Partial<NewContractFormState> {
  const isEmpresa = client.tipoCliente === "empresa"
  const identityDocs = identityArchivosFromClient(client)
  const documentosPorTipo: NewContractFormState["documentosPorTipo"] = {}

  if (identityDocs.length > 0) {
    const slot = isEmpresa ? "cif_empresa" : "dni_nie_titular"
    documentosPorTipo[slot] = identityDocs
  }

  const clientName = [client.nombre, client.apellidos].filter(Boolean).join(" ").trim()

  return {
    clientName,
    nif: client.documento ?? "",
    telefono: client.telefono ?? "",
    email: client.email ?? "",
    direccionFiscal: client.direccion ?? "",
    codigoPostal: client.codigoPostal ?? "",
    poblacion: client.ciudad ?? "",
    provincia: client.provincia ?? "",
    direccionSuministro: client.direccion ?? "",
    cups: client.cups ?? "",
    tipoCliente: isEmpresa ? "pyme" : "residencial",
    wizardStep: "cliente",
    nombreComercial: opts.nombreComercial,
    jefeEquipo: opts.jefeEquipo,
    documentosPorTipo,
  }
}
