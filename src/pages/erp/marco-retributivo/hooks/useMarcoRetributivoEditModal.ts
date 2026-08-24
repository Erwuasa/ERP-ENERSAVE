import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { formatMarcoComisionBase } from "@/data/marco-retributivo-catalog"
import type { MarcoEntryInput, MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { marcoRowToCatalogEntry } from "@/lib/supabase/marco-retributivo"
import {
  emptyMarcoForm,
  marcoRowToForm,
} from "@/pages/erp/marco-retributivo/lib/marco-edit-modal-utils"

type Options = {
  open: boolean
  entry: MarcoRetributivoRow | null
  canEdit: boolean
  isCreateMode: boolean
  onClose: () => void
  onSave: (id: string, patch: Partial<MarcoEntryInput>) => Promise<boolean>
  onCreate: (input: MarcoEntryInput) => Promise<boolean>
}

export function useMarcoRetributivoEditModal({
  open,
  entry,
  canEdit,
  isCreateMode,
  onClose,
  onSave,
  onCreate,
}: Options) {
  const [form, setForm] = useState<MarcoEntryInput>(emptyMarcoForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(entry ? marcoRowToForm(entry) : emptyMarcoForm())
  }, [open, entry])

  const comisionPreview = useMemo(() => {
    const draft: MarcoRetributivoRow = {
      id: entry?.id ?? "draft",
      ...form,
      condicion_1: form.condicion_1 || null,
      condicion_2: form.condicion_2 || null,
      condiciones: form.condiciones || null,
      created_at: entry?.created_at ?? "",
      updated_at: entry?.updated_at ?? "",
      updated_by: entry?.updated_by ?? null,
      activo: form.activo ?? true,
      energia_p1: entry?.energia_p1 ?? null,
      energia_p2: entry?.energia_p2 ?? null,
      energia_p3: entry?.energia_p3 ?? null,
      energia_p4: entry?.energia_p4 ?? null,
      energia_p5: entry?.energia_p5 ?? null,
      energia_p6: entry?.energia_p6 ?? null,
      potencia_p1: entry?.potencia_p1 ?? null,
      potencia_p2: entry?.potencia_p2 ?? null,
      potencia_p3: entry?.potencia_p3 ?? null,
      potencia_p4: entry?.potencia_p4 ?? null,
      potencia_p5: entry?.potencia_p5 ?? null,
      potencia_p6: entry?.potencia_p6 ?? null,
    }
    const formatted = formatMarcoComisionBase(marcoRowToCatalogEntry(draft))
    if (!form.comision_base && form.comision_base !== 0) return "—"
    return formatted || "—"
  }, [form, entry])

  function patchForm(patch: Partial<MarcoEntryInput>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleSave() {
    if (!canEdit) return
    if (!form.tarifa.trim()) {
      toast.error("Indica el nombre de la tarifa.")
      return
    }
    setSaving(true)
    const payload: MarcoEntryInput = {
      ...form,
      condicion_1: form.condicion_1?.trim() || null,
      condicion_2: form.condicion_2?.trim() || null,
      condiciones:
        form.condiciones?.trim() ||
        [form.condicion_1, form.condicion_2].filter(Boolean).join(". ") ||
        null,
      fecha_inicio: entry?.fecha_inicio ?? form.fecha_inicio,
    }
    const ok = isCreateMode
      ? await onCreate(payload)
      : entry
        ? await onSave(entry.id, payload)
        : false
    setSaving(false)
    if (ok) onClose()
  }

  return {
    form,
    saving,
    comisionPreview,
    patchForm,
    handleSave,
  }
}
