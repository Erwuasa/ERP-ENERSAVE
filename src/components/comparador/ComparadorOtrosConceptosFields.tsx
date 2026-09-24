import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  HeartHandshake,
  Layers,
  Receipt,
  Zap,
} from "lucide-react"
import { DecimalComaInput } from "./DecimalComaInput"
import type { ComparadorFormDensity } from "@/lib/comparador-period-layout"
import {
  comparadorFieldLabelClass,
  comparadorNumericInputClass,
} from "@/lib/comparador-period-layout"
import {
  COMPARADOR_DIAS_FACTURACION_MIN,
} from "@/lib/comparador-billing"

interface ComparadorOtrosConceptosFieldsProps {
  density: ComparadorFormDensity
  alquiler: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
  diasFacturados: number
  consumoAnualKwh: number
  facturaMensual: number
  onAlquilerChange: (value: number) => void
  onBonoSocialChange: (value: number) => void
  onEnergiaReactivaChange: (value: number) => void
  onOtrosCostesSvaChange: (value: number) => void
  onDiasFacturadosChange: (value: number) => void
  onConsumoAnualKwhChange: (value: number) => void
  onFacturaMensualChange: (value: number) => void
  descuentoPotencia?: number
  descuentoEnergia?: number
  onDescuentoPotenciaChange?: (value: number) => void
  onDescuentoEnergiaChange?: (value: number) => void
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
  consumoAnualKwh,
  facturaMensual,
  onAlquilerChange,
  onBonoSocialChange,
  onEnergiaReactivaChange,
  onOtrosCostesSvaChange,
  onDiasFacturadosChange,
  onConsumoAnualKwhChange,
  onFacturaMensualChange,
  descuentoPotencia = 0,
  descuentoEnergia = 0,
  onDescuentoPotenciaChange,
  onDescuentoEnergiaChange,
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
          <DecimalComaInput
            value={alquiler}
            onChange={onAlquilerChange}
            showZeroAsEmpty
            className={inputClass}
          />
        </div>
        <div className={fieldClass}>
          <FieldLabelWithIcon icon={HeartHandshake} labelClass={labelClass}>
            Bono social
          </FieldLabelWithIcon>
          <DecimalComaInput
            value={bonoSocial}
            onChange={onBonoSocialChange}
            showZeroAsEmpty
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
            showZeroAsEmpty
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
            showZeroAsEmpty
            className={inputClass}
          />
        </div>

        <div className={`${fieldClass} col-span-2`}>
          <FieldLabelWithIcon icon={Zap} labelClass={labelClass}>
            Consumo anual (kWh) · tramos comisión
          </FieldLabelWithIcon>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={consumoAnualKwh > 0 ? consumoAnualKwh : ""}
            placeholder="Ej. 78500"
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10)
              onConsumoAnualKwhChange(Number.isFinite(parsed) ? parsed : 0)
            }}
            className={inputClass}
            aria-label="Consumo anual en kWh para calcular comisión por tramos del marco retributivo"
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
            showZeroAsEmpty
            className={inputClass}
          />
        </div>

        {onDescuentoPotenciaChange ? (
          <div className={fieldClass}>
            <FieldLabelWithIcon icon={CircleDollarSign} labelClass={labelClass}>
              Descuento potencia
            </FieldLabelWithIcon>
            <DecimalComaInput
              value={descuentoPotencia}
              onChange={onDescuentoPotenciaChange}
              showZeroAsEmpty
              className={inputClass}
            />
          </div>
        ) : null}
        {onDescuentoEnergiaChange ? (
          <div className={fieldClass}>
            <FieldLabelWithIcon icon={CircleDollarSign} labelClass={labelClass}>
              Descuento energía
            </FieldLabelWithIcon>
            <DecimalComaInput
              value={descuentoEnergia}
              onChange={onDescuentoEnergiaChange}
              showZeroAsEmpty
              className={inputClass}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
