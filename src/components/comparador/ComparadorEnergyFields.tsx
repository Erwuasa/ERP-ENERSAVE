import { useEffect, useRef, useState, type ReactNode } from "react"
import { Coins, Flame, Zap } from "lucide-react"
import { ComparadorAdvancedToggle } from "@/components/comparador/ComparadorAdvancedToggle"
import { ComparadorPeriodRows } from "@/components/comparador/ComparadorPeriodRows"
import { DecimalComaInput } from "@/components/comparador/DecimalComaInput"
import { isComparadorGasPeaje } from "@/lib/comparador-access-tariff"
import { resolveComparadorFormDensity, comparadorFieldLabelClass, comparadorNumericInputClass } from "@/lib/comparador-period-layout"
import { SUPPLY_KIND_THEME } from "@/lib/enersave-ui-theme"
import { hasComparadorPeriodPrices, type ComparadorPeriodSlot } from "@/lib/comparador-periods"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"

interface ComparadorEnergyFieldsProps {
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotencia: ComparadorPeriodValues
  preciosEnergia: ComparadorPeriodValues
  onPotenciaChange: (slot: ComparadorPeriodSlot, value: number) => void
  onPotenciaPriceChange: (slot: ComparadorPeriodSlot, value: number) => void
  onConsumoChange: (slot: ComparadorPeriodSlot, value: number) => void
  onConsumoPriceChange: (slot: ComparadorPeriodSlot, value: number) => void
}

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string
  icon: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h4 className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      {action}
    </div>
  )
}

function useRevealPricesWhenFilled(hasPrices: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(false)
  const hadPrices = useRef(false)

  useEffect(() => {
    if (hasPrices && !hadPrices.current) setOpen(true)
    hadPrices.current = hasPrices
  }, [hasPrices])

  return [open, () => setOpen((current) => !current)]
}

export function ComparadorEnergyFields({
  peaje,
  potencias,
  consumos,
  preciosPotencia,
  preciosEnergia,
  onPotenciaChange,
  onPotenciaPriceChange,
  onConsumoChange,
  onConsumoPriceChange,
}: ComparadorEnergyFieldsProps) {
  const density = resolveComparadorFormDensity(peaje)
  const isCompact = density === "compact"
  const isGas = isComparadorGasPeaje(peaje)
  const [showPotenciaPrices, togglePotenciaPrices] = useRevealPricesWhenFilled(
    hasComparadorPeriodPrices(peaje, "potencia", preciosPotencia)
  )
  const [showConsumoPrices, toggleConsumoPrices] = useRevealPricesWhenFilled(
    hasComparadorPeriodPrices(peaje, "consumo", preciosEnergia)
  )
  const showGasPrices = showPotenciaPrices || showConsumoPrices

  if (isGas) {
    const labelClass = comparadorFieldLabelClass(density)
    const inputClass = comparadorNumericInputClass(density)
    return (
      <section className="space-y-2">
        <SectionHeader
          title="Consumo"
          icon={<Flame className={`w-3.5 h-3.5 ${SUPPLY_KIND_THEME.gas.icon}`} />}
          action={
            <ComparadorAdvancedToggle
              active={showGasPrices}
              onToggle={() => {
                const next = !showGasPrices
                if (next !== showPotenciaPrices) togglePotenciaPrices()
                if (next !== showConsumoPrices) toggleConsumoPrices()
              }}
              label="Precios de la factura actual de gas"
            />
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <label className={labelClass}>Consumo (kWh)</label>
            <DecimalComaInput
              value={consumos.p1 || 0}
              onChange={(value) => onConsumoChange("p1", value)}
              showZeroAsEmpty
              className={inputClass}
            />
          </div>
        </div>
        {showGasPrices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Término fijo €/día</span>
              <DecimalComaInput
                value={preciosPotencia.p1 || 0}
                onChange={(value) => onPotenciaPriceChange("p1", value)}
                showZeroAsEmpty
                className={inputClass}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Término variable €/kWh</span>
              <DecimalComaInput
                value={preciosEnergia.p1 || 0}
                onChange={(value) => onConsumoPriceChange("p1", value)}
                showZeroAsEmpty
                className={inputClass}
              />
            </div>
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <div className={isCompact ? "space-y-3" : "space-y-4"}>
      <section>
        <SectionHeader
          title="Potencia"
          icon={<Zap className="w-3.5 h-3.5" />}
          action={
            <ComparadorAdvancedToggle
              active={showPotenciaPrices}
              onToggle={togglePotenciaPrices}
              label="Precios de potencia de la factura actual"
            />
          }
        />
        <ComparadorPeriodRows
          mode="potencia"
          peaje={peaje}
          values={potencias}
          priceValues={preciosPotencia}
          showPrices={showPotenciaPrices}
          onValueChange={onPotenciaChange}
          onPriceChange={onPotenciaPriceChange}
        />
      </section>

      <section>
        <SectionHeader
          title="Consumo"
          icon={<Coins className="w-3.5 h-3.5" />}
          action={
            <ComparadorAdvancedToggle
              active={showConsumoPrices}
              onToggle={toggleConsumoPrices}
              label="Precios de consumo de la factura actual"
            />
          }
        />
        <ComparadorPeriodRows
          mode="consumo"
          peaje={peaje}
          values={consumos}
          priceValues={preciosEnergia}
          showPrices={showConsumoPrices}
          onValueChange={onConsumoChange}
          onPriceChange={onConsumoPriceChange}
        />
      </section>
    </div>
  )
}
