import { describe, expect, it } from "vitest"
import type { Contract } from "@/types/contract"
import { listPendingWizardDocumentoUploads } from "@/lib/supabase/contrato-documentos-storage"

describe("listPendingWizardDocumentoUploads", () => {
  it("recoge archivos con pendingFile por tipo", () => {
    const file = new File(["x"], "factura.pdf", { type: "application/pdf" })
    const uploads = listPendingWizardDocumentoUploads({
      factura_luz: [
        {
          name: "factura.pdf",
          size: "1 KB",
          uploadedAt: "2026-01-01T00:00:00.000Z",
          pendingFile: file,
        },
      ],
      dni_nie_titular: [{ name: "ya-subido.pdf", size: "1 KB", uploadedAt: "2026-01-01T00:00:00.000Z" }],
    })

    expect(uploads).toHaveLength(1)
    expect(uploads[0]?.tipoId).toBe("factura_luz")
    expect(uploads[0]?.file).toBe(file)
  })

  it("omite pendingFile si el contrato ya tiene ese documento en Storage", () => {
    const file = new File(["x"], "factura.pdf", { type: "application/pdf" })
    const contract = {
      id: "c1",
      documentos: [
        {
          id: "d1",
          name: "factura.pdf",
          size: "1 KB",
          tipo: "factura_luz",
          uploadedAt: "2026-01-01T00:00:00.000Z",
          storagePath: "c1/d1/factura.pdf",
        },
      ],
    } as Contract

    const uploads = listPendingWizardDocumentoUploads(
      {
        factura_luz: [
          {
            name: "factura.pdf",
            size: "1 KB",
            uploadedAt: "2026-01-01T00:00:00.000Z",
            pendingFile: file,
          },
        ],
      },
      contract
    )

    expect(uploads).toHaveLength(0)
  })
})
