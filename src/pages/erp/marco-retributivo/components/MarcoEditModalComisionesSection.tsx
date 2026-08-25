import { Layers } from "lucide-react"
import type { MarcoEntryInput } from "@/lib/supabase/marco-retributivo"
import {
  FieldLabel,
  MARCO_INPUT_CLASS,
  ReadOnlyBox,
} from "@/pages/erp/marco-retributivo/components/MarcoEditModalFields"
import { COMISION_UNIDAD_OPTIONS } from "@/pages/erp/marco-retributivo/lib/marco-edit-modal-utils"

type Props = {
  form: MarcoEntryInput
  canEdit: boolean
  comisionPreview: string
  patchForm: (patch: Partial<MarcoEntryInput>) => void
}

export function MarcoEditModalComisionesSection({
  form,
  canEdit,
  comisionPreview,
  patchForm,
}: Props) {
  const disabled = !canEdit

  return (
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
                    className={MARCO_INPUT_CLASS}
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
              className={`${MARCO_INPUT_CLASS} cursor-pointer`}
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
              className={`${MARCO_INPUT_CLASS} cursor-pointer`}
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
              onChange={(e) => patchForm({ comision_base: Number(e.target.value) || 0 })}
              className={MARCO_INPUT_CLASS}
            />
          </div>
          <div>
            <FieldLabel>Permanencia (meses)</FieldLabel>
            <input
              type="number"
              min={0}
              value={form.vigencia_meses}
              onChange={(e) => patchForm({ vigencia_meses: Number(e.target.value) || 0 })}
              className={MARCO_INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Condiciones (texto libre)</FieldLabel>
            <textarea
              value={form.condiciones ?? ""}
              onChange={(e) => patchForm({ condiciones: e.target.value })}
              rows={2}
              className={`${MARCO_INPUT_CLASS} resize-y`}
            />
          </div>
        </div>
      )}
    </section>
  )
}
