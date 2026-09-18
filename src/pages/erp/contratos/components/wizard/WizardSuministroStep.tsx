import { Coins, Flame, Lightbulb, Plus } from "lucide-react"
import type { MarcoTramoResolution } from "@/lib/marco-consumo-tramo"
import type { ServicioExtraOption } from "@/lib/marco-servicios-extras"
import { WizardAccessTariffChips } from "@/components/contratos/WizardAccessTariffChips"
import type { ContractPeajeSegment } from "@/lib/contract-peaje-segment"
import type { NewContractFormState } from "@/lib/contract-registration"
import { SUPPLY_KIND_THEME } from "@/lib/enersave-ui-theme"
import type { Contract } from "@/types/contract"
import {
  CONTRACT_ESTADO_INICIAL,
  getContractEstadoBadgeClass,
} from "@/lib/contract-estado"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import {
  FORMA_PAGO_LABELS,
  WIZARD_INPUT_CLASS,
  WIZARD_LABEL_CLASS,
  WIZARD_READ_ONLY_FIELD_CLASS,
} from "@/pages/erp/contratos/components/wizard/wizard-ui"
import {
  getVisiblePotenciaPeriods,
  peajeSegmentToTariffPeajeType,
} from "@/lib/contract-potencia"

type Props = {
  form: NewContractFormState
  activeUserName: string
  filteredTariffs: MarcoRetributivoEntry[]
  duplicateCups: Contract | null
  commissionEstimate: {
    amountEur: number
    amountLabel?: string
    precision?: MarcoTramoResolution["precision"]
    condicionLabel?: string
    extrasAmount?: number
    selectedExtrasCount?: number
  } | null
  marcoTramoResolution: MarcoTramoResolution
  formatCurrency: (val: number) => string
  commissionPercentage: number
  serviciosExtrasOptions: ServicioExtraOption[]
  selectedServiciosExtras: string[]
  serviciosExtrasExpanded: boolean
  onToggleServiciosExtras: () => void
  onToggleServicioExtra: (id: string) => void
  onChange: (patch: Partial<NewContractFormState>) => void
  selectTariff: (tarifa: string) => void
  setPeajeSegment: (segment: ContractPeajeSegment) => void
  setTipo: (tipo: "luz" | "gas") => void
  handlePotenciaP1Change: (value: string) => void
}

export function WizardSuministroStep({
  form,
  activeUserName,
  filteredTariffs,
  duplicateCups,
  commissionEstimate,
  marcoTramoResolution,
  formatCurrency,
  commissionPercentage,
  serviciosExtrasOptions,
  selectedServiciosExtras,
  serviciosExtrasExpanded,
  onToggleServiciosExtras,
  onToggleServicioExtra,
  onChange,
  selectTariff,
  setPeajeSegment,
  setTipo,
  handlePotenciaP1Change,
}: Props) {
  const visiblePeriods = getVisiblePotenciaPeriods(
    peajeSegmentToTariffPeajeType(form.peajeSegment)
  )
  const rate = commissionPercentage / 100

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0">
      <div className="flex flex-wrap items-end gap-3 shrink-0">
        <div className="space-y-0.5">
          <label className={WIZARD_LABEL_CLASS}>Tipo contrato</label>
          <div className="flex gap-1.5">
            {(["luz", "gas"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                  form.tipo === t ? SUPPLY_KIND_THEME[t].tabActive : "border-brand-border text-brand-subtext"
                }`}
              >
                {t === "luz" ? <Lightbulb className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <label className={WIZARD_LABEL_CLASS}>Tarifa de acceso</label>
          <WizardAccessTariffChips
            value={form.peajeSegment}
            onChange={setPeajeSegment}
            compact
          />
        </div>
        <div className="space-y-0.5">
          <label className={WIZARD_LABEL_CLASS}>Estado</label>
          <span
            className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase ${getContractEstadoBadgeClass(CONTRACT_ESTADO_INICIAL)}`}
          >
            {CONTRACT_ESTADO_INICIAL}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-2.5 gap-y-2 flex-1 min-h-0 content-start overflow-y-auto pr-0.5">
        <div className="col-span-12">
          <label className={WIZARD_LABEL_CLASS}>Tarifa {form.compania}</label>
          <div className="flex items-stretch gap-2">
            <select
              value={form.tarifa || ""}
              onChange={(e) => {
                if (e.target.value) selectTariff(e.target.value)
              }}
              className={`${WIZARD_INPUT_CLASS} py-1.5 flex-1 min-w-0`}
            >
              <option value="">
                {filteredTariffs.length === 0
                  ? "Sin tarifas para este segmento, peaje y suministro"
                  : "Seleccionar tarifa…"}
              </option>
              {filteredTariffs.map((entry) => (
                <option key={`${entry.tarifa}-${entry.peaje}`} value={entry.tarifa}>
                  {entry.tarifa} ({entry.peaje})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleServiciosExtras}
              aria-expanded={serviciosExtrasExpanded}
              className={`shrink-0 inline-flex items-center justify-center w-10 rounded-lg border transition-colors cursor-pointer ${
                serviciosExtrasExpanded
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-brand-border bg-brand-surface text-brand-text hover:border-cyan-500/50 hover:bg-cyan-500/10"
              }`}
              title="Servicios extras (SVA, SSA…)"
              aria-label="Mostrar servicios extras"
            >
              <Plus className={`w-4 h-4 transition-transform ${serviciosExtrasExpanded ? "rotate-45" : ""}`} />
            </button>
          </div>

          {form.tarifa && marcoTramoResolution.condicionLabel ? (
            <div className="mt-1.5">
              <label className={WIZARD_LABEL_CLASS}>Condición / tramo</label>
              <input
                type="text"
                readOnly
                value={marcoTramoResolution.condicionLabel}
                className={`${WIZARD_READ_ONLY_FIELD_CLASS} py-1.5 text-[11px]`}
              />
              {marcoTramoResolution.precision === "estimado" ? (
                <p className="text-[9px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                  Comisión aproximada: indica el consumo anual para calcular el tramo exacto.
                </p>
              ) : null}
            </div>
          ) : null}

          {serviciosExtrasExpanded ? (
            <div className="mt-2 rounded-xl border border-brand-border bg-brand-surface/50 p-2.5 space-y-2">
              <p className="text-[10px] font-mono uppercase text-brand-subtext">
                Servicios extras disponibles
              </p>
              {serviciosExtrasOptions.length === 0 ? (
                <p className="text-[10px] font-mono text-brand-subtext">
                  No hay servicios extras para esta compañía, segmento y peaje.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {serviciosExtrasOptions.map((option) => {
                    const selected = selectedServiciosExtras.includes(option.id)
                    const commercialAmount = Math.round(option.amountEur * rate * 100) / 100
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onToggleServicioExtra(option.id)}
                        className={`inline-flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors duration-200 cursor-pointer max-w-full ${
                          selected
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200"
                            : "border-brand-border bg-brand-panel text-brand-text hover:border-slate-300/70 dark:hover:border-slate-500/50"
                        }`}
                      >
                        <span className="text-[10px] font-semibold leading-snug">{option.label}</span>
                        <span className="text-[9px] font-mono text-brand-subtext">
                          {formatCurrency(commercialAmount)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="col-span-6 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>CUPS</label>
          <input
            type="text"
            value={form.cups}
            onChange={(e) => onChange({ cups: e.target.value.toUpperCase() })}
            className={`${WIZARD_INPUT_CLASS} font-mono py-1.5`}
          />
          {duplicateCups ? (
            <p className="text-[9px] text-amber-600 font-mono mt-0.5 truncate">
              Ya registrado: {duplicateCups.clientName}
            </p>
          ) : null}
        </div>

        <div className="col-span-6 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>Consumo anual (kWh)</label>
          <input
            type="number"
            min={0}
            value={form.consumoAnual}
            onChange={(e) =>
              onChange({
                consumoAnual: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>Fecha inicio</label>
          <input
            type="date"
            value={form.fechaInicio}
            onChange={(e) => onChange({ fechaInicio: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12">
          <label className={WIZARD_LABEL_CLASS}>Dirección suministro</label>
          <input
            type="text"
            value={form.direccionSuministro}
            onChange={(e) => onChange({ direccionSuministro: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12 sm:col-span-6">
          <label className={WIZARD_LABEL_CLASS}>IBAN</label>
          <input
            type="text"
            value={form.iban}
            onChange={(e) => onChange({ iban: e.target.value.toUpperCase() })}
            className={`${WIZARD_INPUT_CLASS} font-mono py-1.5`}
          />
        </div>

        <div className="col-span-12 sm:col-span-6">
          <label className={WIZARD_LABEL_CLASS}>Forma de pago</label>
          <select
            value={form.formaPago}
            onChange={(e) =>
              onChange({
                formaPago: e.target.value as NewContractFormState["formaPago"],
              })
            }
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          >
            {Object.entries(FORMA_PAGO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 sm:col-span-6">
          <label className={WIZARD_LABEL_CLASS}>Comercial</label>
          <input
            type="text"
            readOnly
            value={form.nombreComercial || activeUserName}
            className={`${WIZARD_READ_ONLY_FIELD_CLASS} py-1.5`}
          />
        </div>

        {commissionEstimate ? (
          <div className="col-span-12 sm:col-span-6 flex items-center gap-2 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 self-end">
            <Coins className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[9px] font-mono uppercase text-brand-subtext">
                Comisión est.
                {commissionEstimate.precision === "estimado" ? " (rango)" : ""}
              </p>
              <p className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                {commissionEstimate.amountLabel ?? formatCurrency(commissionEstimate.amountEur)}
              </p>
              {(commissionEstimate.extrasAmount ?? 0) > 0 ? (
                <p className="text-[9px] font-mono text-brand-subtext">
                  Incluye {formatCurrency(commissionEstimate.extrasAmount ?? 0)} en servicios extras
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="col-span-12">
          <label className={WIZARD_LABEL_CLASS}>Potencias (kW)</label>
          <div
            className={`grid gap-1.5 ${visiblePeriods.length <= 2 ? "grid-cols-2" : "grid-cols-6"}`}
          >
            {visiblePeriods.map((label) => {
              const index = Number(label.slice(1))
              const key = `potenciaP${index}` as keyof NewContractFormState
              return (
                <div key={label}>
                  <span className="text-[8px] font-mono text-brand-subtext block mb-0.5 text-center">
                    {label}
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    value={String(form[key])}
                    onChange={(e) => {
                      if (label === "P1") handlePotenciaP1Change(e.target.value)
                      else onChange({ [key]: e.target.value })
                    }}
                    className={`${WIZARD_INPUT_CLASS} text-center font-mono py-1`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
