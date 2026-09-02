import { useEffect, useMemo, useState } from "react"
import { MARCO_COMPANIAS_LUZ } from "@/data/marco-retributivo-catalog"
import { listAtCatalogEntries } from "@/lib/supabase/at-catalog"
import { formatMarcoSegmentoLabel, MARCO_SEGMENTO_OPTIONS } from "@/lib/supabase/marco-retributivo"
import type { MarcoEntryInput } from "@/lib/supabase/marco-retributivo"
import {
  FieldLabel,
  MARCO_INPUT_CLASS,
  ReadOnlyBox,
} from "@/pages/erp/marco-retributivo/components/MarcoEditModalFields"
import { PEAJE_OPTIONS } from "@/pages/erp/marco-retributivo/lib/marco-edit-modal-utils"

type Props = {
  form: MarcoEntryInput
  disabled: boolean
  patchForm: (patch: Partial<MarcoEntryInput>) => void
}

export function MarcoEditModalDatosSection({ form, disabled, patchForm }: Props) {
  const [catalogCompanies, setCatalogCompanies] = useState<string[]>([])

  useEffect(() => {
    void listAtCatalogEntries("billing-companies").then((result) => {
      if (result.ok) {
        setCatalogCompanies(result.data.map((row) => row.label).filter(Boolean))
      }
    })
  }, [])

  const companies = useMemo(() => {
    const set = new Set(
      [...MARCO_COMPANIAS_LUZ.filter((c) => c !== "Todos"), ...catalogCompanies, form.compania].filter(
        Boolean
      )
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [catalogCompanies, form.compania])
  return (
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
              className={`${MARCO_INPUT_CLASS} cursor-pointer`}
            >
              {companies.map((c) => (
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
              onChange={(e) => patchForm({ tipo: e.target.value as "luz" | "gas" })}
              className={`${MARCO_INPUT_CLASS} cursor-pointer uppercase`}
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
                patchForm({ segmento: e.target.value as MarcoEntryInput["segmento"] })
              }
              className={`${MARCO_INPUT_CLASS} cursor-pointer`}
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
              className={`${MARCO_INPUT_CLASS} cursor-pointer`}
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
              className={MARCO_INPUT_CLASS}
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
              className={MARCO_INPUT_CLASS}
              placeholder="Nombre comercial de la tarifa"
            />
          )}
        </div>
      </div>
    </section>
  )
}
