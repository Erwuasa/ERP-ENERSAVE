import { Layers } from "lucide-react"
import type { MarcoEntryInput } from "@/lib/supabase/marco-retributivo"
import { MARCO_INPUT_CLASS, ReadOnlyBox } from "@/pages/erp/marco-retributivo/components/MarcoEditModalFields"

type Props = {
  form: MarcoEntryInput
  canEdit: boolean
  canEditComision: boolean
  comisionPreview: string
  patchForm: (patch: Partial<MarcoEntryInput>) => void
}

export function MarcoEditModalComisionesSection({
  form,
  canEdit,
  canEditComision,
  comisionPreview,
  patchForm,
}: Props) {
  const permanenciaLabel =
    form.vigencia_meses > 0 ? `${form.vigencia_meses} meses` : "—"

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
              <th className="px-4 py-2 text-left text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Condición 2
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-mono font-bold uppercase text-brand-subtext w-[7rem]">
                Permanencia
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-mono font-bold uppercase text-emerald-600">
                Comisión
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-brand-panel">
              <td className="px-4 py-3 align-middle">
                {canEdit ? (
                  <input
                    type="text"
                    value={form.condicion_2 ?? ""}
                    onChange={(e) => patchForm({ condicion_2: e.target.value })}
                    className={`${MARCO_INPUT_CLASS} text-[11px] py-2`}
                    placeholder="Ej. DE 0 A 10 KW"
                  />
                ) : (
                  <span className="text-brand-text font-medium uppercase text-[11px]">
                    {form.condicion_2?.trim() || "—"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 align-middle text-right font-mono text-[11px] text-brand-subtext whitespace-nowrap">
                {canEdit && form.segmento === "pyme" ? (
                  <ReadOnlyBox>{permanenciaLabel}</ReadOnlyBox>
                ) : (
                  permanenciaLabel
                )}
              </td>
              <td className="px-4 py-3 align-middle text-right font-mono font-bold text-emerald-600 dark:text-emerald-500 whitespace-nowrap">
                {canEditComision ? (
                  <div className="inline-flex items-center gap-1.5 justify-end max-w-full">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.comision_base}
                      onChange={(e) =>
                        patchForm({
                          comision_base: Number(e.target.value) || 0,
                          comision_tipo: "fija",
                          comision_unidad: "eur_cups",
                        })
                      }
                      className={`${MARCO_INPUT_CLASS} text-right w-[5.5rem] py-1.5 tabular-nums`}
                      aria-label="Valor comisión"
                    />
                    <span className="text-[10px] text-brand-subtext font-semibold">€/CUPS</span>
                  </div>
                ) : (
                  comisionPreview
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canEdit && (
        <p className="text-[10px] text-brand-subtext leading-relaxed px-1">
          Comisión en €/CUPS. Solo superadmin puede modificar el importe. Permanencia PYME: 12 meses.
        </p>
      )}
    </section>
  )
}
