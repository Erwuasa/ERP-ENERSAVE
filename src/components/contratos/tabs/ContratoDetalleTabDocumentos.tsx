import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import { DocumentoSlotCard } from "@/components/contratos/DocumentoSlotCard"
import { ContratoDocumentosUploadedList } from "@/components/contratos/ContratoDocumentosUploadedList"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"
import {
  CONTRATO_DOCUMENTO_TIPOS,
  groupDocumentosByTipo,
  type ContratoDocumentoRecord,
  type ContratoDocumentoTipoId,
} from "@/lib/contrato-documentos"
import type { ContratoDocumentoArchivo } from "@/lib/contract-registration"
import {
  downloadContratoDocumentoBlob,
  getContratoDocumentoDownloadUrl,
  uploadContratoDocumento,
} from "@/lib/supabase/contrato-documentos-storage"

interface ContratoDetalleTabDocumentosProps {
  contract: Contract
  activeUserId: string
  activeUserName: string
  onContractUpdated: (contract: Contract) => void
}

function toSlotFiles(docs: ContratoDocumentoRecord[]): ContratoDocumentoArchivo[] {
  return docs.map((doc) => ({
    name: doc.name,
    size: doc.size,
    uploadedAt: doc.uploadedAt,
    dataUrl: doc.dataUrl,
  }))
}

function normalizeContractDocumentos(contract: Contract): ContratoDocumentoRecord[] {
  return (contract.documentos ?? []).map((doc, index) => ({
    id: doc.id ?? `${doc.name}-${doc.uploadedAt ?? index}`,
    name: doc.name,
    size: doc.size,
    tipo: doc.tipo ?? "otros",
    uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
    storagePath: doc.storagePath,
    mimeType: doc.mimeType,
    dataUrl: doc.dataUrl,
  }))
}

export function ContratoDetalleTabDocumentos({
  contract,
  activeUserId,
  activeUserName,
  onContractUpdated,
}: ContratoDetalleTabDocumentosProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [uploadingTipo, setUploadingTipo] = useState<ContratoDocumentoTipoId | null>(null)

  const documentos = useMemo(() => normalizeContractDocumentos(contract), [contract])
  const documentosPorTipo = useMemo(() => groupDocumentosByTipo(documentos), [documentos])

  const handleUpload = useCallback(
    async (tipoId: ContratoDocumentoTipoId, files: File[]) => {
      if (files.length === 0) return
      setUploadingTipo(tipoId)

      let latestContract = contract

      try {
        for (const file of files) {
          const result = await uploadContratoDocumento({
            contract: latestContract,
            tipoId,
            file,
            autorId: activeUserId,
            autorNombre: activeUserName,
          })

          if (result.ok === false) {
            toast.error(result.message ?? "No se pudo subir el documento.")
            return
          }

          latestContract = result.data
          onContractUpdated(result.data)
        }

        toast.success(
          files.length === 1
            ? "Documento adjuntado al expediente."
            : `${files.length} documentos adjuntados al expediente.`
        )
      } finally {
        setUploadingTipo(null)
      }
    },
    [activeUserId, activeUserName, contract, onContractUpdated]
  )

  const handleDownload = useCallback(async (doc: ContratoDocumentoRecord) => {
    setDownloadingId(doc.id)

    try {
      if (doc.storagePath) {
        const signed = await getContratoDocumentoDownloadUrl(doc.storagePath)
        if (signed.ok) {
          window.open(signed.data, "_blank", "noopener,noreferrer")
          return
        }

        const blobResult = await downloadContratoDocumentoBlob(doc.storagePath)
        if (blobResult.ok === false) {
          toast.error(blobResult.message ?? "No se pudo descargar el documento.")
          return
        }

        const url = URL.createObjectURL(blobResult.data)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = doc.name
        anchor.click()
        URL.revokeObjectURL(url)
        return
      }

      if (doc.dataUrl) {
        const anchor = document.createElement("a")
        anchor.href = doc.dataUrl
        anchor.download = doc.name
        anchor.click()
        return
      }

      toast.error("Este documento no tiene archivo descargable.")
    } finally {
      setDownloadingId(null)
    }
  }, [])

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONTRATO_DOCUMENTO_TIPOS.map((tipo) => (
          <DocumentoSlotCard
            key={tipo.id}
            label={tipo.label}
            files={toSlotFiles(documentosPorTipo[tipo.id] ?? [])}
            onAddFiles={() => {}}
            allowRemove={false}
            showInlineFileList={false}
            countHint="o arrastra aquí tus archivos"
            onUploadRawFiles={(files) => handleUpload(tipo.id, files)}
          />
        ))}
      </div>

      {uploadingTipo ? (
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-300">
          Subiendo documento en {CONTRATO_DOCUMENTO_TIPOS.find((t) => t.id === uploadingTipo)?.label}…
        </p>
      ) : null}

      <ContratoDetalleSection title="Archivos subidos">
        <ContratoDocumentosUploadedList
          documentos={documentos}
          downloadingId={downloadingId}
          onDownload={handleDownload}
        />
      </ContratoDetalleSection>
    </div>
  )
}
