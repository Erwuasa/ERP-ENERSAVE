import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Eye, Layers, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { MARCO_COMPANIAS_LUZ } from "../data/marco-retributivo-catalog"
import type {
  MarcoEntryInput,
  MarcoRetributivoRow,
  NewMarcoEntryInput,
} from "../lib/supabase/marco-retributivo"
import {
  formatMarcoSegmentoLabel,
  MARCO_SEGMENTO_OPTIONS,
  normalizeSegmento,
} from "../lib/supabase/marco-retributivo"
import { formatMarcoComisionBase } from "../data/marco-retributivo-catalog"
import { marcoRowToCatalogEntry } from "../lib/supabase/marco-retributivo"

const PEAJE_OPTIONS = [
  "2.0TD",
  "3.0TD",
  "6.0TD",
  "6.0TD / 6.1TD",
  "RL.1 / RL.2",
  "RL.2 / RL.3",
  "RL.3",
] as const

const COMISION_UNIDAD_OPTIONS = [
  { value: "eur_cups", label: "€ / CUPS" },
  { value: "porcentaje_facturado", label: "% facturado" },
  { value: "porcentaje_consumo", label: "% consumo" },
  { value: "porcentaje_termino", label: "% término" },
] as const

interface MarcoRetributivoEditModalProps {
  open: boolean
  entry: MarcoRetributivoRow | null
  canEdit: boolean
  isCreateMode: boolean
  allEntries: MarcoRetributivoRow[]
  onClose: () => void
  onSave: (id: string, patch: Partial<MarcoEntryInput>) => Promise<boolean>
  onCreate: (input: NewMarcoEntryInput) => Promise<boolean>
}

function emptyForm(): MarcoEntryInput {
  return {
    compania: "Endesa",
    tarifa: "",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "pyme",
    condicion_1: "",
    condicion_2: "",
    condiciones: "",
    comision_tipo: "fija",
    comision_base: 0,
    comision_unidad: "eur_cups",
    vigencia_meses: 0,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    activo: true,
  }
}

function rowToForm(row: MarcoRetributivoRow): MarcoEntryInput {
  return {
    compania: row.compania,
    tarifa: row.tarifa,
    tipo: row.tipo,
    peaje: row.peaje,
    segmento: normalizeSegmento(row.segmento),
    condicion_1: row.condicion_1 ?? "",
    condicion_2: row.condicion_2 ?? "",
    condiciones: row.condiciones ?? "",
    comision_tipo: row.comision_tipo,
    comision_base: row.comision_base,
    comision_unidad: row.comision_unidad,
    vigencia_meses: row.vigencia_meses,
    fecha_inicio: row.fecha_inicio,
    activo: row.activo,
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide mb-1.5">
      {children}
    </span>
  )
}

function ReadOnlyBox({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`px-3 py-2.5 rounded-lg border border-brand-border bg-brand-surface/80 text-xs font-medium text-brand-text min-h-[38px] flex items-center ${className}`}
    >
      {children}
    </div>
  )
}

export function MarcoRetributivoEditModal({
  open,
  entry,
  canEdit,
  isCreateMode,
  onClose,
  onSave,
  onCreate,
}: MarcoRetributivoEditModalProps) {
  const [form, setForm] = useState<MarcoEntryInput>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(entry ? rowToForm(entry) : emptyForm())
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
    }
    const formatted = formatMarcoComisionBase(marcoRowToCatalogEntry(draft))
    if (!form.comision_base && form.comision_base !== 0) return "—"
    return formatted || "—"
  }, [form, entry])

  if (!open) return null

  const titleCompania = form.compania || "Nueva entrada"
  const disabled = !canEdit

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

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-text disabled:opacity-70 disabled:cursor-not-allowed"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marco-modal-title"
        className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-brand-border">
          <div className="space-y-2 min-w-0">
            <h3
              id="marco-modal-title"
              className="text-base font-bold text-brand-text tracking-tight truncate"
            >
              Marco retributivo · {titleCompania}
            </h3>
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Modo edición
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Vista de solo lectura
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-1">
          <section className="space-y-3">
            <h4 className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Datos del marco
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Compañía</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox>{form.compania}</ReadOnlyBox>
                ) : (
                  <select
                    value={form.compania}
                    onChange={(e) => patchForm({ compania: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {MARCO_COMPANIAS_LUZ.filter((c) => c !== "Todos").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <FieldLabel>Servicio</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox className="uppercase">{form.tipo}</ReadOnlyBox>
                ) : (
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      patchForm({ tipo: e.target.value as "luz" | "gas" })
                    }
                    className={`${inputClass} cursor-pointer uppercase`}
                  >
                    <option value="luz">Luz</option>
                    <option value="gas">Gas</option>
                  </select>
                )}
              </div>
              <div>
                <FieldLabel>Segmento</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox>{formatMarcoSegmentoLabel(form.segmento)}</ReadOnlyBox>
                ) : (
                  <select
                    value={form.segmento}
                    onChange={(e) =>
                      patchForm({
                        segmento: e.target.value as MarcoEntryInput["segmento"],
                      })
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    {MARCO_SEGMENTO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <FieldLabel>Peaje de acceso</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox>{form.peaje}</ReadOnlyBox>
                ) : (
                  <select
                    value={form.peaje}
                    onChange={(e) => patchForm({ peaje: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {PEAJE_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {!PEAJE_OPTIONS.includes(form.peaje as (typeof PEAJE_OPTIONS)[number]) && (
                      <option value={form.peaje}>{form.peaje}</option>
                    )}
                  </select>
                )}
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Condición 1</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox>{form.condicion_1?.trim() || "—"}</ReadOnlyBox>
                ) : (
                  <input
                    type="text"
                    value={form.condicion_1 ?? ""}
                    onChange={(e) => patchForm({ condicion_1: e.target.value })}
                    className={inputClass}
                    placeholder="Ej. =&lt;10 KW MOBILE NEGOCIO"
                  />
                )}
              </div>
              <div className="sm:col-span-3">
                <FieldLabel>Tarifa</FieldLabel>
                {disabled ? (
                  <ReadOnlyBox>{form.tarifa || "—"}</ReadOnlyBox>
                ) : (
                  <input
                    type="text"
                    value={form.tarifa}
                    onChange={(e) => patchForm({ tarifa: e.target.value })}
                    className={inputClass}
                    placeholder="Nombre comercial de la tarifa"
                  />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              Comisiones
            </h4>

            <div className="rounded-xl border border-brand-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-brand-surface/80 border-b border-brand-border">
                    <th className="px-4 py-2.5 text-left text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Condición 2
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Comisión
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-brand-panel">
                    <td className="px-4 py-3 align-top">
                      {disabled ? (
                        <span className="text-brand-text font-medium uppercase text-[11px]">
                          {form.condicion_2?.trim() || "—"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={form.condicion_2 ?? ""}
                          onChange={(e) => patchForm({ condicion_2: e.target.value })}
                          className={inputClass}
                          placeholder="Ej. DE 0 A 10 KW"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-mono font-bold text-brand-text whitespace-nowrap">
                      {comisionPreview}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-dashed border-brand-border bg-brand-surface/40">
                <div>
                  <FieldLabel>Tipo comisión</FieldLabel>
                  <select
                    value={form.comision_tipo}
                    onChange={(e) =>
                      patchForm({
                        comision_tipo: e.target.value as "fija" | "porcentaje",
                        comision_unidad:
                          e.target.value === "fija"
                            ? "eur_cups"
                            : form.comision_unidad === "eur_cups"
                              ? "porcentaje_facturado"
                              : form.comision_unidad,
                      })
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="fija">Fija</option>
                    <option value="porcentaje">Porcentaje</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Unidad</FieldLabel>
                  <select
                    value={form.comision_unidad}
                    disabled={form.comision_tipo === "fija"}
                    onChange={(e) =>
                      patchForm({
                        comision_unidad: e.target.value as MarcoEntryInput["comision_unidad"],
                      })
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    {COMISION_UNIDAD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Valor comisión</FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.comision_base}
                    onChange={(e) =>
                      patchForm({ comision_base: Number(e.target.value) || 0 })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Permanencia (meses)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    value={form.vigencia_meses}
                    onChange={(e) =>
                      patchForm({ vigencia_meses: Number(e.target.value) || 0 })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Condiciones (texto libre)</FieldLabel>
                  <textarea
                    value={form.condiciones ?? ""}
                    onChange={(e) => patchForm({ condiciones: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-brand-border bg-brand-surface/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs font-bold text-brand-text hover:border-emerald-500/30 cursor-pointer"
          >
            Cerrar
          </button>
          {canEdit && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Guardando…" : isCreateMode ? "Crear entrada" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
