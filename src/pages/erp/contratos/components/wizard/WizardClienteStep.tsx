import { ChevronDown, ChevronRight } from "lucide-react"
import { buildClientNameFromForm, type NewContractFormState, type TipoClienteContrato } from "@/lib/contract-registration"
import type { Client } from "@/types/client"
import { ClientPortfolioSearch } from "@/components/contratos/ClientPortfolioSearch"
import {
  TIPO_CLIENTE_OPTIONS,
  WIZARD_INPUT_CLASS,
  WIZARD_LABEL_CLASS,
} from "@/pages/erp/contratos/components/wizard/wizard-ui"

type Props = {
  form: NewContractFormState
  clients: Client[]
  activeUserId: string
  empresaOpen: boolean
  setEmpresaOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  cpLookupLoading: boolean
  onChange: (patch: Partial<NewContractFormState>) => void
  handleNombreChange: (nombre: string) => void
  handleApellidosChange: (apellidos: string) => void
  handleCodigoPostalChange: (value: string) => void
}

export function WizardClienteStep({
  form,
  clients,
  activeUserId,
  empresaOpen,
  setEmpresaOpen,
  cpLookupLoading,
  onChange,
  handleNombreChange,
  handleApellidosChange,
  handleCodigoPostalChange,
}: Props) {
  return (
    <>
      <ClientPortfolioSearch clients={clients} activeUserId={activeUserId} onSelectClient={onChange} />

      <section className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
          Datos del titular
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={WIZARD_LABEL_CLASS}>Nombre</label>
            <input
              type="text"
              value={form.clientNombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={WIZARD_LABEL_CLASS}>Apellidos</label>
            <input
              type="text"
              value={form.clientApellidos}
              onChange={(e) => handleApellidosChange(e.target.value)}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={WIZARD_LABEL_CLASS}>DNI-NIE</label>
            <input
              type="text"
              value={form.nif}
              onChange={(e) => onChange({ nif: e.target.value.toUpperCase() })}
              className={`${WIZARD_INPUT_CLASS} font-mono uppercase`}
            />
          </div>
        </div>

        <div className="border border-brand-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setEmpresaOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-brand-text hover:bg-brand-surface/60 cursor-pointer"
          >
            {empresaOpen ? (
              <ChevronDown className="w-4 h-4 text-brand-subtext" />
            ) : (
              <ChevronRight className="w-4 h-4 text-brand-subtext" />
            )}
            Empresa / Pyme (opcional)
          </button>
          {empresaOpen && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-brand-border pt-3">
              <div>
                <label className={WIZARD_LABEL_CLASS}>Tipo de cliente</label>
                <select
                  value={form.tipoCliente}
                  onChange={(e) =>
                    onChange({
                      tipoCliente: e.target.value as TipoClienteContrato,
                      tarifa: "",
                      marcoEntryId: "",
                    })
                  }
                  className={WIZARD_INPUT_CLASS}
                >
                  {TIPO_CLIENTE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={WIZARD_LABEL_CLASS}>Razón social / CIF</label>
                <input
                  type="text"
                  value={form.razonSocial}
                  onChange={(e) =>
                    onChange({
                      razonSocial: e.target.value,
                      clientName: e.target.value || buildClientNameFromForm(form),
                    })
                  }
                  className={WIZARD_INPUT_CLASS}
                  placeholder="Empresa S.L."
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={WIZARD_LABEL_CLASS}>Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => onChange({ telefono: e.target.value })}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={WIZARD_LABEL_CLASS}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label className={WIZARD_LABEL_CLASS}>Dirección</label>
          <input
            type="text"
            value={form.direccionFiscal}
            onChange={(e) => onChange({ direccionFiscal: e.target.value })}
            className={WIZARD_INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={WIZARD_LABEL_CLASS}>
              Código postal
              {cpLookupLoading && (
                <span className="text-cyan-500 normal-case ml-1">detectando…</span>
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={form.codigoPostal}
              onChange={(e) => handleCodigoPostalChange(e.target.value)}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={WIZARD_LABEL_CLASS}>Localidad</label>
            <input
              type="text"
              value={form.poblacion}
              onChange={(e) => onChange({ poblacion: e.target.value })}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={WIZARD_LABEL_CLASS}>Provincia</label>
            <input
              type="text"
              value={form.provincia}
              onChange={(e) => onChange({ provincia: e.target.value })}
              className={WIZARD_INPUT_CLASS}
            />
          </div>
        </div>
      </section>
    </>
  )
}
