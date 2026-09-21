import { ChevronDown, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { buildClientNameFromForm, type NewContractFormState, type TipoClienteContrato } from "@/lib/contract-registration"
import type { Client } from "@/types/client"
import { ClientPortfolioSearch, ClientSuggestList } from "@/components/contratos/ClientPortfolioSearch"
import {
  clientToContractFormPatch,
  rankPortfolioMatches,
  visiblePortfolioClients,
} from "@/lib/client-portfolio-search"
import {
  TIPO_CLIENTE_OPTIONS,
  WIZARD_INPUT_CLASS,
  WIZARD_LABEL_CLASS,
} from "@/pages/erp/contratos/components/wizard/wizard-ui"

type Props = {
  form: NewContractFormState
  clients: Client[]
  activeUserId: string
  activeRole: string
  teamMemberIds?: string[]
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
  activeRole,
  teamMemberIds = [],
  empresaOpen,
  setEmpresaOpen,
  cpLookupLoading,
  onChange,
  handleNombreChange,
  handleApellidosChange,
  handleCodigoPostalChange,
}: Props) {
  const [nombreFocused, setNombreFocused] = useState(false)
  const portfolio = useMemo(
    () =>
      visiblePortfolioClients({
        clients,
        activeRole,
        activeUserId,
        teamMemberIds,
      }),
    [clients, activeRole, activeUserId, teamMemberIds]
  )
  const nombreMatches = useMemo(
    () => (form.clientNombre.trim().length >= 1 ? rankPortfolioMatches(portfolio, form.clientNombre, 8) : []),
    [portfolio, form.clientNombre]
  )
  const showNombreSuggest = nombreFocused && form.clientNombre.trim().length >= 1 && nombreMatches.length > 0

  function selectExistingClient(client: Client) {
    onChange(clientToContractFormPatch(client))
    setNombreFocused(false)
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="shrink-0">
        <ClientPortfolioSearch
          clients={clients}
          activeUserId={activeUserId}
          activeRole={activeRole}
          teamMemberIds={teamMemberIds}
          onSelectClient={onChange}
        />
      </div>

      <div className="grid grid-cols-12 gap-x-2.5 gap-y-2 flex-1 min-h-0 content-start">
        <div className="col-span-12 sm:col-span-4 relative">
          <label className={WIZARD_LABEL_CLASS}>Nombre</label>
          <input
            type="text"
            value={form.clientNombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            onFocus={() => setNombreFocused(true)}
            onBlur={() => window.setTimeout(() => setNombreFocused(false), 150)}
            autoComplete="off"
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
          {showNombreSuggest ? (
            <ClientSuggestList clients={nombreMatches} onSelect={selectExistingClient} />
          ) : null}
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>Apellidos</label>
          <input
            type="text"
            value={form.clientApellidos}
            onChange={(e) => handleApellidosChange(e.target.value)}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>DNI-NIE</label>
          <input
            type="text"
            value={form.nif}
            onChange={(e) => onChange({ nif: e.target.value.toUpperCase() })}
            className={`${WIZARD_INPUT_CLASS} font-mono uppercase py-1.5`}
          />
        </div>

        <div className="col-span-12 sm:col-span-6">
          <label className={WIZARD_LABEL_CLASS}>Teléfono</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => onChange({ telefono: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>
        <div className="col-span-12 sm:col-span-6">
          <label className={WIZARD_LABEL_CLASS}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12">
          <label className={WIZARD_LABEL_CLASS}>Dirección</label>
          <input
            type="text"
            value={form.direccionFiscal}
            onChange={(e) => onChange({ direccionFiscal: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12 sm:col-span-4">
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
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>Localidad</label>
          <input
            type="text"
            value={form.poblacion}
            onChange={(e) => onChange({ poblacion: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <label className={WIZARD_LABEL_CLASS}>Provincia</label>
          <input
            type="text"
            value={form.provincia}
            onChange={(e) => onChange({ provincia: e.target.value })}
            className={`${WIZARD_INPUT_CLASS} py-1.5`}
          />
        </div>

        <div className="col-span-12 border border-brand-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setEmpresaOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-brand-text hover:bg-brand-surface/60 cursor-pointer"
          >
            {empresaOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-brand-subtext" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-brand-subtext" />
            )}
            Empresa / Pyme (opcional)
          </button>
          {empresaOpen && (
            <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-brand-border pt-2">
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
                  className={`${WIZARD_INPUT_CLASS} py-1.5`}
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
                  className={`${WIZARD_INPUT_CLASS} py-1.5`}
                  placeholder="Empresa S.L."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
