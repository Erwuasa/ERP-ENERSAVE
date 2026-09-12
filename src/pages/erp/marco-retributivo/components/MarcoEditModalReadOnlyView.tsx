import { Layers } from "lucide-react"
import { formatMarcoComisionUsuario } from "@/data/marco-retributivo-catalog"
import {
  formatMarcoSegmentoLabel,
  marcoRowToCatalogEntry,
  type MarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"
import {
  DetailField,
  DetailPanel,
} from "@/pages/erp/marco-retributivo/components/MarcoEditModalDetailGrid"

type Props = {
  form: MarcoEntryInput
  commissionPercentage: number
  formatCurrency: (val: number) => string
}

export function MarcoEditModalReadOnlyView({
  form,
  commissionPercentage,
  formatCurrency,
}: Props) {
  const permanenciaLabel =
    form.vigencia_meses > 0 ? `${form.vigencia_meses} meses` : "Sin permanencia"

  const draftEntry = marcoRowToCatalogEntry({
    id: "readonly",
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
  })

  const tuComision = formatMarcoComisionUsuario(
    draftEntry,
    commissionPercentage,
    formatCurrency
  )

  return (
    <div className="space-y-4">
      <section className="space-y-2.5">
        <h4 className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
          Datos del marco
        </h4>
        <DetailPanel columns={4}>
          <DetailField label="Compañía" value={form.compania || "—"} />
          <DetailField label="Servicio" value={form.tipo.toUpperCase()} />
          <DetailField label="Segmento" value={formatMarcoSegmentoLabel(form.segmento)} />
          <DetailField label="Peaje" value={form.peaje || "—"} />
          <DetailField
            label="Condición 1"
            value={form.condicion_1?.trim() || "—"}
            className="sm:col-span-2"
          />
          <DetailField label="Tarifa" value={form.tarifa || "—"} className="sm:col-span-2" />
        </DetailPanel>
      </section>

      <section className="space-y-2.5">
        <h4 className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Comisiones
        </h4>
        <DetailPanel columns={3}>
          <DetailField
            label="Condición 2"
            value={form.condicion_2?.trim() || "—"}
            className="uppercase"
          />
          <DetailField label="Permanencia" value={permanenciaLabel} align="center" />
          <DetailField label="Comisión" value={tuComision} accent="emerald" align="right" />
        </DetailPanel>
      </section>
    </div>
  )
}
