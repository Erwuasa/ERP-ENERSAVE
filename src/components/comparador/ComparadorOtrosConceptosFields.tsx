import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  Hash,
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
  COMPARADOR_DIAS_FACTURACION_MENSUAL,
  normalizeComparadorDiasFacturacion,
} from "@/lib/comparador-billing"
import { annualKwhFromSipsResumen, cupsLookupReadiness } from "@/lib/sips/fast-lookup"
import { lookupSipsPreferringCache } from "@/lib/supabase/sips"
import type { SipsProducto, SipsResumen } from "@/lib/sips/types"

function DiasFacturadosInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (value: number) => void
  className: string
}) {
  const [draft, setDraft] = useState(() => String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      onChange={(event) => {
        const raw = event.target.value.replace(/[^\d]/g, "")
        setDraft(raw)
        if (raw === "") return
        const parsed = Number.parseInt(raw, 10)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
      onBlur={() => {
        if (draft.trim() === "") {
          onChange(COMPARADOR_DIAS_FACTURACION_MENSUAL)
          setDraft(String(COMPARADOR_DIAS_FACTURACION_MENSUAL))
          return
        }
        const normalized = normalizeComparadorDiasFacturacion(Number.parseInt(draft, 10))
        onChange(normalized)
        setDraft(String(normalized))
      }}
      className={className}
      aria-label="Días facturados del periodo"
    />
  )
}

function ComparadorConsumoAnualFields({
  labelClass,
  inputClass,
  fieldClass,
  producto,
  cups,
  onCupsChange,
  consumoAnualKwh,
  onConsumoAnualKwhChange,
  onSipsResumen,
}: {
  labelClass: string
  inputClass: string
  fieldClass: string
  producto: SipsProducto
  cups: string
  onCupsChange: (value: string) => void
  consumoAnualKwh: number
  onConsumoAnualKwhChange: (value: number) => void
  onSipsResumen?: (resumen: SipsResumen) => void
}) {
  const [hint, setHint] = useState<string | null>(null)
  const onChangeRef = useRef(onConsumoAnualKwhChange)
  const onSipsRef = useRef(onSipsResumen)
  onChangeRef.current = onConsumoAnualKwhChange
  onSipsRef.current = onSipsResumen

  useEffect(() => {
    const ready = cupsLookupReadiness(cups)
    if (ready.state === "empty" || ready.state === "incomplete") {
      setHint(null)
      return
    }
    if (ready.state === "invalid") {
      setHint(ready.message)
      return
    }

    let cancelled = false
    setHint(producto === "gas" ? "Consultando SIPS de gas…" : "Consultando SIPS…")
    void lookupSipsPreferringCache(ready.cups, producto).then((outcome) => {
      if (cancelled) return
      if (outcome.status === "listo") {
        onSipsRef.current?.(outcome.resumen)
        const kwh = annualKwhFromSipsResumen(outcome.resumen)
        if (kwh == null) {
          setHint("SIPS no trae consumo anual.")
          return
        }
        onChangeRef.current(kwh)
        setHint(producto === "gas" ? "Consumo anual desde SIPS de gas." : "Consumo anual desde SIPS.")
        return
      }
      if (outcome.status === "procesando") {
        setHint("SIPS sigue preparando este CUPS.")
        return
      }
      if (outcome.status === "sin_datos") {
        setHint("SIPS no tiene datos para este CUPS.")
        return
      }
      setHint(outcome.message)
    })
    return () => {
      cancelled = true
    }
  }, [cups, producto])

  return (
    <>
      <div className={fieldClass}>
        <FieldLabelWithIcon icon={Hash} labelClass={labelClass}>
          CUPS
        </FieldLabelWithIcon>
        <input
          type="text"
          value={cups}
          autoComplete="off"
          spellCheck={false}
          placeholder="ES0021…"
          onChange={(event) => onCupsChange(event.target.value.toUpperCase())}
          className={`${inputClass} uppercase`}
          aria-label="CUPS para consultar el consumo anual en SIPS"
        />
      </div>
      <div className={fieldClass}>
        <FieldLabelWithIcon icon={Zap} labelClass={labelClass}>
          Consumo anual (kWh)
        </FieldLabelWithIcon>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={consumoAnualKwh > 0 ? consumoAnualKwh : ""}
          placeholder="Ej. 78500"
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            onConsumoAnualKwhChange(Number.isFinite(parsed) ? parsed : 0)
          }}
          className={inputClass}
          aria-label="Consumo anual en kWh para calcular comisión por tramos del marco retributivo"
        />
      </div>
      {hint ? <p className="col-span-2 text-[10px] font-mono text-brand-subtext">{hint}</p> : null}
    </>
  )
}

interface ComparadorOtrosConceptosFieldsProps {
  density: ComparadorFormDensity
  producto?: SipsProducto
  alquiler: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
  diasFacturados: number
  cups: string
  onCupsChange: (value: string) => void
  consumoAnualKwh: number
  facturaMensual: number
  onAlquilerChange: (value: number) => void
  onBonoSocialChange: (value: number) => void
  onEnergiaReactivaChange: (value: number) => void
  onOtrosCostesSvaChange: (value: number) => void
  onDiasFacturadosChange: (value: number) => void
  onConsumoAnualKwhChange: (value: number) => void
  onSipsResumen?: (resumen: SipsResumen) => void
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
  producto = "luz",
  alquiler,
  bonoSocial,
  energiaReactiva,
  otrosCostesSva,
  diasFacturados,
  cups,
  onCupsChange,
  consumoAnualKwh,
  facturaMensual,
  onAlquilerChange,
  onBonoSocialChange,
  onEnergiaReactivaChange,
  onOtrosCostesSvaChange,
  onDiasFacturadosChange,
  onConsumoAnualKwhChange,
  onSipsResumen,
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
  const isGas = producto === "gas"

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
        {isGas ? null : (
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
        )}

        {isGas ? null : (
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
        )}
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

        <ComparadorConsumoAnualFields
          labelClass={labelClass}
          inputClass={inputClass}
          fieldClass={fieldClass}
          producto={producto}
          cups={cups}
          onCupsChange={onCupsChange}
          consumoAnualKwh={consumoAnualKwh}
          onConsumoAnualKwhChange={onConsumoAnualKwhChange}
          onSipsResumen={onSipsResumen}
        />

        <div className={fieldClass}>
          <FieldLabelWithIcon icon={CalendarDays} labelClass={labelClass}>
            Días facturados
          </FieldLabelWithIcon>
          <DiasFacturadosInput
            value={diasFacturados}
            onChange={onDiasFacturadosChange}
            className={inputClass}
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
              {isGas ? "Dto. término fijo" : "Descuento potencia"}
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
