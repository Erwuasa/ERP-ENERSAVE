import { Coins, Flame, Lightbulb, MessageSquare } from "lucide-react"
import type { NewContractFormState } from "@/lib/contract-registration"
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

type Props = {
  form: NewContractFormState
  activeUserName: string
  tariffSearch: string
  setTariffSearch: (value: string) => void
  filteredTariffs: MarcoRetributivoEntry[]
  duplicateCups: Contract | null
  commissionEstimate: { amountEur: number } | null
  formatCurrency: (val: number) => string
  newComment: string
  setNewComment: (value: string) => void
  onChange: (patch: Partial<NewContractFormState>) => void
  selectTariff: (entryId: string, tarifa: string) => void
  handlePotenciaP1Change: (value: string) => void
  postComment: () => void
}

export function WizardSuministroStep({
  form,
  activeUserName,
  tariffSearch,
  setTariffSearch,
  filteredTariffs,
  duplicateCups,
  commissionEstimate,
  formatCurrency,
  newComment,
  setNewComment,
  onChange,
  selectTariff,
  handlePotenciaP1Change,
  postComment,
}: Props) {
  return (
    <>
      <div>
        <label className={WIZARD_LABEL_CLASS}>Estado del contrato</label>
        <span
          className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase ${getContractEstadoBadgeClass(CONTRACT_ESTADO_INICIAL)}`}
        >
          {CONTRACT_ESTADO_INICIAL}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={WIZARD_LABEL_CLASS}>Tipo de contrato</label>
          <div className="flex gap-2">
            {(["luz", "gas"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ tipo: t, tarifa: "", marcoEntryId: "" })}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                  form.tipo === t
                    ? t === "luz"
                      ? "bg-amber-300/25 border-amber-400/55 text-amber-800 dark:text-amber-200"
                      : "bg-orange-400/20 border-orange-400/50 text-orange-800 dark:text-orange-200"
                    : "border-brand-border text-brand-subtext"
                }`}
              >
                {t === "luz" ? <Lightbulb className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={WIZARD_LABEL_CLASS}>Tipo de tarifa</label>
          <input
            type="search"
            placeholder="Buscar tarifa…"
            value={tariffSearch}
            onChange={(e) => setTariffSearch(e.target.value)}
            className={`${WIZARD_INPUT_CLASS} mb-2`}
          />
          <select
            value={form.marcoEntryId || ""}
            onChange={(e) => {
              const entry = filteredTariffs.find((x) => x.id === e.target.value)
              if (entry) selectTariff(entry.id, entry.tarifa)
            }}
            className={WIZARD_INPUT_CLASS}
          >
            <option value="">Seleccionar tarifa…</option>
            {filteredTariffs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.tarifa} ({entry.peaje})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={WIZARD_LABEL_CLASS}>CUPS</label>
          <input
            type="text"
            value={form.cups}
            onChange={(e) => onChange({ cups: e.target.value.toUpperCase() })}
            className={`${WIZARD_INPUT_CLASS} font-mono`}
          />
          {duplicateCups && (
            <p className="text-[10px] text-amber-600 font-mono mt-1">
              CUPS ya registrado: {duplicateCups.clientName}
            </p>
          )}
        </div>
        <div>
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
            className={WIZARD_INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={WIZARD_LABEL_CLASS}>Dirección de suministro</label>
          <input
            type="text"
            value={form.direccionSuministro}
            onChange={(e) => onChange({ direccionSuministro: e.target.value })}
            className={WIZARD_INPUT_CLASS}
          />
        </div>
        <div>
          <label className={WIZARD_LABEL_CLASS}>IBAN</label>
          <input
            type="text"
            value={form.iban}
            onChange={(e) => onChange({ iban: e.target.value.toUpperCase() })}
            className={`${WIZARD_INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label className={WIZARD_LABEL_CLASS}>Forma de pago</label>
          <select
            value={form.formaPago}
            onChange={(e) =>
              onChange({
                formaPago: e.target.value as NewContractFormState["formaPago"],
              })
            }
            className={WIZARD_INPUT_CLASS}
          >
            {Object.entries(FORMA_PAGO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={WIZARD_LABEL_CLASS}>Fecha inicio</label>
          <input
            type="date"
            value={form.fechaInicio}
            onChange={(e) => onChange({ fechaInicio: e.target.value })}
            className={WIZARD_INPUT_CLASS}
          />
        </div>
        <div>
          <label className={WIZARD_LABEL_CLASS}>Nombre del comercial</label>
          <input
            type="text"
            readOnly
            value={form.nombreComercial || activeUserName}
            className={WIZARD_READ_ONLY_FIELD_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={WIZARD_LABEL_CLASS}>Potencias contratadas (kW)</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(["P1", "P2", "P3", "P4", "P5", "P6"] as const).map((label, i) => {
              const key = `potenciaP${i + 1}` as keyof NewContractFormState
              return (
                <div key={label}>
                  <span className="text-[9px] font-mono text-brand-subtext block mb-0.5">
                    {label}
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    value={String(form[key])}
                    onChange={(e) => {
                      if (label === "P1") {
                        handlePotenciaP1Change(e.target.value)
                      } else {
                        onChange({ [key]: e.target.value })
                      }
                    }}
                    className={`${WIZARD_INPUT_CLASS} text-center font-mono py-1.5`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {commissionEstimate && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Coins className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-[10px] font-mono uppercase text-brand-subtext">Comisión estimada</p>
            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(commissionEstimate.amountEur)}
            </p>
          </div>
        </div>
      )}

      <div className="border border-brand-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-violet-500" />
          <span className="text-[10px] font-mono font-bold uppercase text-brand-text">
            Comentarios internos
          </span>
        </div>
        <div className="max-h-28 overflow-y-auto space-y-2">
          {form.comentariosInternos.map((c) => (
            <div
              key={c.id}
              className="text-xs bg-brand-surface rounded-lg p-2 border border-brand-border/60"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-mono font-bold text-cyan-600">{c.authorName}</span>
                <span className="text-[8px] font-mono uppercase text-brand-subtext">
                  {c.authorRole}
                </span>
              </div>
              <p className="text-brand-text">{c.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Añadir comentario…"
            className={WIZARD_INPUT_CLASS}
          />
          <button
            type="button"
            onClick={postComment}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
          >
            Enviar
          </button>
        </div>
      </div>
    </>
  )
}
