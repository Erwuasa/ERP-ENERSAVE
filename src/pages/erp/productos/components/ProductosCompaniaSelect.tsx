import { CompaniaFilterSelect } from "@/components/erp/CompaniaFilterSelect"

type Props = {
  value: string
  onChange: (value: string) => void
  companias: string[]
  countsByCompania: Record<string, number>
}

/** Selector compacto en cabecera de Tarifas (acento cyan del módulo). */
export function ProductosCompaniaSelect(props: Props) {
  return (
    <CompaniaFilterSelect
      {...props}
      allOptionValue="Todas"
      allOptionLabel="Todas"
      fieldLabel="Tarifas"
      accent="cyan"
      size="compact"
    />
  )
}
