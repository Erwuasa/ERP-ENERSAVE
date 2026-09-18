import { Euro, Layers } from "lucide-react"
import { formatMarcoPermanenciaLabel } from "@/lib/marco-permanencia"
import { resolveMarcoCondicion2Label } from "@/lib/marco-tramo-condicion"
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
  const permanenciaLabel = formatMarcoPermanenciaLabel({
    compania: form.compania,
    segmento: form.segmento,
    vigencia_meses: form.vigencia_meses,
    condiciones: form.condiciones,
    condicion_2: form.condicion_2,
  })

  const condicion2Label =
    resolveMarcoCondicion2Label({
      id: "modal",
      ...form,
      condicion_1: form.condicion_1 || null,
      condicion_2: form.condicion_2 || null,
      condiciones: form.condiciones || null,
      created_at: "",
      updated_at: "",
      updated_by: null,
      activo: form.activo ?? true,
      energia_p1: null,
      energia_p2: null,
      energia_p3: null,
      energia_p4: null,
      energia_p5: null,
      energia_p6: null,
      potencia_p1: null,
      potencia_p2: null,
      potencia_p3: null,
      potencia_p4: null,
      potencia_p5: null,
      potencia_p6: null,
    }) ??
    (form.condicion_2?.trim() || "—")

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
                    placeholder="Ej. 750-1250 MWh"
                  />
                ) : (
                  <span className="text-brand-text font-medium uppercase text-[11px]">
                    {condicion2Label}
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
                    <Euro className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  </div>
                ) : (
                  comisionPreview
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </section>
  )
}
