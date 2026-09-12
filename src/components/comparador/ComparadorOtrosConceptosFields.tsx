import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  HeartHandshake,
  Layers,
  Receipt,
} from "lucide-react"
import { DecimalComaInput } from "./DecimalComaInput"
import type { ComparadorFormDensity } from "@/lib/comparador-period-layout"
import {
  comparadorFieldLabelClass,
  comparadorNumericInputClass,
} from "@/lib/comparador-period-layout"
import {
  COMPARADOR_DIAS_FACTURACION_MAX,
  COMPARADOR_DIAS_FACTURACION_MIN,
} from "@/lib/comparador-billing"

interface ComparadorOtrosConceptosFieldsProps {
  density: ComparadorFormDensity
  alquiler: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
  diasFacturados: number
  facturaMensual: number
  onAlquilerChange: (value: number) => void
  onBonoSocialChange: (value: number) => void
  onEnergiaReactivaChange: (value: number) => void
  onOtrosCostesSvaChange: (value: number) => void
  onDiasFacturadosChange: (value: number) => void
  onFacturaMensualChange: (value: number) => void
}

function FieldLabelWithIcon({
  icon: Icon,
  labelClass,
  children,
}: {
  icon: LucideIcon
  labelClass: string
  children: string
}) {
  return (
    <label className={`flex items-center gap-1 ${labelClass}`}>
      <Icon className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
      {children}
    </label>
  )
}

export function ComparadorOtrosConceptosFields({
  density,
  alquiler,
  bonoSocial,
  energiaReactiva,
  otrosCostesSva,
  diasFacturados,
  facturaMensual,
  onAlquilerChange,
  onBonoSocialChange,
  onEnergiaReactivaChange,
  onOtrosCostesSvaChange,
  onDiasFacturadosChange,
  onFacturaMensualChange,
}: ComparadorOtrosConceptosFieldsProps) {
  const labelClass = comparadorFieldLabelClass(density)
  const inputClass = comparadorNumericInputClass(density)
  const fieldClass = "space-y-1"
  const gridGap = density === "compact" ? "gap-2.5" : "gap-2"

  return (
    <section className="pt-1 border-t border-brand-border/60">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <h4 className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide">
          Otros conceptos
        </h4>
      </div>

      <div className={`grid grid-cols-2 ${gridGap}`}>
        <div className={fieldClass}>
          <FieldLabelWithIcon icon={Gauge} labelClass={labelClass}>
            Alquiler contador
          </FieldLabelWithIcon>
          <DecimalComaInput value={alquiler} onChange={onAlquilerChange} className={inputClass} />
        </div>
        <div className={fieldClass}>
          <FieldLabelWithIcon icon={HeartHandshake} labelClass={labelClass}>
            Bono social
          </FieldLabelWithIcon>
          <DecimalComaInput
            value={bonoSocial}
            onChange={onBonoSocialChange}
            className={inputClass}
          />
        </div>

        <div className={fieldClass}>
          <FieldLabelWithIcon icon={Activity} labelClass={labelClass}>
            Reactiva
          </FieldLabelWithIcon>
          <DecimalComaInput
            value={energiaReactiva}
            onChange={onEnergiaReactivaChange}
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <FieldLabelWithIcon icon={Layers} labelClass={labelClass}>
            Otros costes / SVA
          </FieldLabelWithIcon>
          <DecimalComaInput
            value={otrosCostesSva}
            onChange={onOtrosCostesSvaChange}
            className={inputClass}
          />
        </div>

        <div className={fieldClass}>
          <FieldLabelWithIcon icon={CalendarDays} labelClass={labelClass}>
            Días facturados
          </FieldLabelWithIcon>
          <input
            type="number"
            inputMode="numeric"
            min={COMPARADOR_DIAS_FACTURACION_MIN}
            max={COMPARADOR_DIAS_FACTURACION_MAX}
            step={1}
            value={diasFacturados}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10)
              if (Number.isFinite(parsed)) onDiasFacturadosChange(parsed)
            }}
            className={inputClass}
            aria-label="Días facturados del periodo"
          />
        </div>
        <div className={fieldClass}>
          <FieldLabelWithIcon icon={CircleDollarSign} labelClass={labelClass}>
            Total factura €
          </FieldLabelWithIcon>
          <DecimalComaInput
            value={facturaMensual}
            onChange={onFacturaMensualChange}
            className={inputClass}
          />
        </div>
      </div>
    </section>
  )
}
