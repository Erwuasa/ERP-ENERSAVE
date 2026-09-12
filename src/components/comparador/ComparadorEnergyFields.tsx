import type { ReactNode } from "react"
import { Coins, Zap } from "lucide-react"
import { resolveComparadorFormDensity } from "@/lib/comparador-period-layout"
import { ComparadorAdvancedToggle } from "@/components/comparador/ComparadorAdvancedToggle"
import { ComparadorPeriodRows } from "@/components/comparador/ComparadorPeriodRows"
import type { ComparadorPeriodSlot } from "@/lib/comparador-periods"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"

interface ComparadorEnergyFieldsProps {
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotencia: ComparadorPeriodValues
  preciosEnergia: ComparadorPeriodValues
  showAdvancedPotencia: boolean
  showAdvancedConsumo: boolean
  onToggleAdvancedPotencia: () => void
  onToggleAdvancedConsumo: () => void
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

export function ComparadorEnergyFields({
  peaje,
  potencias,
  consumos,
  preciosPotencia,
  preciosEnergia,
  showAdvancedPotencia,
  showAdvancedConsumo,
  onToggleAdvancedPotencia,
  onToggleAdvancedConsumo,
  onPotenciaChange,
  onPotenciaPriceChange,
  onConsumoChange,
  onConsumoPriceChange,
}: ComparadorEnergyFieldsProps) {
  const density = resolveComparadorFormDensity(peaje)
  const isCompact = density === "compact"

  return (
    <div className={isCompact ? "space-y-3" : "space-y-4"}>
      <section>
        <SectionHeader
          title="Potencia"
          icon={<Zap className="w-3.5 h-3.5" />}
          action={
            <ComparadorAdvancedToggle
              active={showAdvancedPotencia}
              onToggle={onToggleAdvancedPotencia}
            />
          }
        />
        <ComparadorPeriodRows
          mode="potencia"
          peaje={peaje}
          values={potencias}
          priceValues={preciosPotencia}
          showAdvanced={showAdvancedPotencia}
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
              active={showAdvancedConsumo}
              onToggle={onToggleAdvancedConsumo}
            />
          }
        />
        <ComparadorPeriodRows
          mode="consumo"
          peaje={peaje}
          values={consumos}
          priceValues={preciosEnergia}
          showAdvanced={showAdvancedConsumo}
          onValueChange={onConsumoChange}
          onPriceChange={onConsumoPriceChange}
        />
      </section>
    </div>
  )
}
