import { describe, expect, it } from "vitest"
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
})
