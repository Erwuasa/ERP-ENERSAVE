import type { NewContractFormState } from "../lib/contract-registration"

interface NewContractFormFieldsProps {
  form: NewContractFormState
  onChange: (patch: Partial<NewContractFormState>) => void
}

const inputClass =
  "w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-brand-border rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 text-brand-text"
const labelClass = "block text-[10px] font-mono text-brand-subtext uppercase"

export function NewContractFormFields({ form, onChange }: NewContractFormFieldsProps) {
  return (
    <>
      <div className="space-y-1">
        <label className={labelClass}>
          Cliente / cooperativa <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.clientName}
          onChange={(e) => onChange({ clientName: e.target.value })}
          placeholder="Ej. Cooperativa Agrícola"
          className={`${inputClass} font-medium`}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          CUPS <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.cups}
          onChange={(e) => onChange({ cups: e.target.value.toUpperCase() })}
          placeholder="ES0021000000..."
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          NIF / NIE / CIF <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.nif}
          onChange={(e) => onChange({ nif: e.target.value.toUpperCase() })}
          className={`${inputClass} font-mono uppercase`}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Teléfono <span className="text-rose-500">*</span>
        </label>
        <input
          type="tel"
          required
          value={form.telefono}
          onChange={(e) => onChange({ telefono: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Email <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          IBAN <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.iban}
          onChange={(e) => onChange({ iban: e.target.value.toUpperCase() })}
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1 sm:col-span-2">
        <label className={labelClass}>
          Dirección de suministro <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.direccionSuministro}
          onChange={(e) => onChange({ direccionSuministro: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Suministro <span className="text-rose-500">*</span>
        </label>
        <select
          required
          value={form.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as "luz" | "gas" })}
          className={inputClass}
        >
          <option value="luz">Luz</option>
          <option value="gas">Gas</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Comercializadora <span className="text-rose-500">*</span>
        </label>
        <select
          required
          value={form.compania}
          onChange={(e) => onChange({ compania: e.target.value })}
          className={inputClass}
        >
          <option value="Iberdrola">Iberdrola</option>
          <option value="Endesa">Endesa</option>
          <option value="Naturgy">Naturgy</option>
          <option value="TotalEnergies">TotalEnergies</option>
          <option value="Niba Energía">Niba Energía</option>
          <option value="Ignis">Ignis</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Tarifa <span className="text-rose-500">*</span>
        </label>
        <select
          required
          value={form.tarifa}
          onChange={(e) => onChange({ tarifa: e.target.value })}
          className={inputClass}
        >
          <option value="Indexada Pool">Indexada Pool OMIE</option>
          <option value="Fija Confort">Fija Estabilidad</option>
          <option value="PVPC Regulada">PVPC Regulada</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Tipo de precio <span className="text-rose-500">*</span>
        </label>
        <select
          required
          value={form.tipoPrecio}
          onChange={(e) =>
            onChange({ tipoPrecio: e.target.value as "fijo" | "mercado" })
          }
          className={inputClass}
        >
          <option value="">Seleccionar…</option>
          <option value="fijo">Precio fijo</option>
          <option value="mercado">Precio de mercado</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Potencia contratada (kW) <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.potenciaContratada}
          onChange={(e) => onChange({ potenciaContratada: e.target.value })}
          placeholder="Ej. 9.2"
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Precio fijo consumo (€/kWh) <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          inputMode="decimal"
          value={form.precioFijoConsumo}
          onChange={(e) => onChange({ precioFijoConsumo: e.target.value })}
          placeholder="Ej. 0,118"
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Fecha inicio contrato <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          required
          value={form.fechaInicio}
          onChange={(e) => onChange({ fechaInicio: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass}>
          Consumo anual estimado (kWh) <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          required
          min={1}
          value={form.consumoAnual}
          onChange={(e) =>
            onChange({
              consumoAnual: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          placeholder="15000"
          className={`${inputClass} font-mono`}
        />
      </div>
    </>
  )
}
