import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { FileText, X } from "lucide-react"
import type { Contract } from "@/types/contract"
import { formatActivationDate } from "@/pages/erp/contratos/components/contratos-panel-utils"
import {
  formatContractDisplayId,
  type ContratoDetalleTab,
} from "@/components/contratos/contrato-detalle-types"
import { ContratoDetalleSidebar } from "@/components/contratos/ContratoDetalleSidebar"
import { ContratoNotasPanel } from "@/components/contratos/ContratoNotasPanel"
import { ContratoDetalleTabIncidencias } from "@/components/contratos/tabs/ContratoDetalleTabIncidencias"
import { ContratoDetalleTabContrato } from "@/components/contratos/tabs/ContratoDetalleTabContrato"
import { ContratoDetalleTabCliente } from "@/components/contratos/tabs/ContratoDetalleTabCliente"
import { ContratoDetalleTabSuministro } from "@/components/contratos/tabs/ContratoDetalleTabSuministro"
import { ContratoDetalleTabTarifaMarco } from "@/components/contratos/tabs/ContratoDetalleTabTarifaMarco"
import { ContratoDetalleTabComisiones } from "@/components/contratos/tabs/ContratoDetalleTabComisiones"
import { ContratoDetalleTabFechas } from "@/components/contratos/tabs/ContratoDetalleTabFechas"
import { ContratoDetalleTabDocumentos } from "@/components/contratos/tabs/ContratoDetalleTabDocumentos"
import { ContratoDetalleTabHistorial } from "@/components/contratos/tabs/ContratoDetalleTabHistorial"
import { useAtContractNotes } from "@/hooks/use-at-contract-notes"
import type {
  AtContractDocument,
  AtContractEmail,
  AtContractEvent,
  AtContractNote,
} from "@/lib/supabase/at-contract-notes"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

const PANEL_MS = 90
const BACKDROP_MS = 60

interface ContratoDetallePanelProps {
  contract: Contract
  onClose: () => void
  comercialEmail?: string
  profiles: ProfileOption[]
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  activeUserId: string
  activeUserName: string
  onContractUpdated: (contract: Contract) => void
}

function renderActiveTab(
  tab: ContratoDetalleTab,
  contract: Contract,
  options: {
    comercialEmail?: string
    profiles: ProfileOption[]
    formatCurrency: (val: number) => string
    renderCompaniaLogo: (brandName: string) => ReactNode
    activeUserId: string
    activeUserName: string
    onContractUpdated: (contract: Contract) => void
    atStatusNote?: string
    atIncidentAt?: string
    atNotes?: AtContractNote[]
    atEvents?: AtContractEvent[]
    atDocuments?: AtContractDocument[]
    atEmails?: AtContractEmail[]
    atNotesLoading?: boolean
  }
) {
  const {
    comercialEmail,
    profiles,
    formatCurrency,
    renderCompaniaLogo,
    activeUserId,
    activeUserName,
    onContractUpdated,
  } = options
  switch (tab) {
    case "incidencias":
      return (
        <ContratoDetalleTabIncidencias
          contract={contract}
          statusNote={options.atStatusNote}
          incidentAt={options.atIncidentAt}
          notes={options.atNotes}
          loading={options.atNotesLoading}
        />
      )
    case "contrato":
      return <ContratoDetalleTabContrato contract={contract} comercialEmail={comercialEmail} />
    case "cliente":
      return <ContratoDetalleTabCliente contract={contract} />
    case "suministro":
      return <ContratoDetalleTabSuministro contract={contract} />
    case "tarifa_marco":
      return (
        <ContratoDetalleTabTarifaMarco
          contract={contract}
          renderCompaniaLogo={renderCompaniaLogo}
        />
      )
    case "comisiones":
      return (
        <ContratoDetalleTabComisiones
          contract={contract}
          profiles={profiles}
          formatCurrency={formatCurrency}
        />
      )
    case "fechas":
      return <ContratoDetalleTabFechas />
    case "documentos":
      return (
        <ContratoDetalleTabDocumentos
          contract={contract}
          activeUserId={activeUserId}
          activeUserName={activeUserName}
          onContractUpdated={onContractUpdated}
          atDocuments={options.atDocuments}
          atDocumentsLoading={options.atNotesLoading}
        />
      )
    case "historial":
      return (
        <ContratoDetalleTabHistorial
          contratoId={contract.id}
          events={options.atEvents}
          emails={options.atEmails}
          loading={options.atNotesLoading}
        />
      )
    default:
      return null
  }
}

export function ContratoDetallePanel({
  contract,
  onClose,
  comercialEmail,
  profiles,
  formatCurrency,
  renderCompaniaLogo,
  activeUserId,
  activeUserName,
  onContractUpdated,
}: ContratoDetallePanelProps) {
  const [activeTab, setActiveTab] = useState<ContratoDetalleTab>("contrato")
  const [isOpen, setIsOpen] = useState(false)
  const [showNotas, setShowNotas] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const displayId = formatContractDisplayId(contract.id)
  const atExtras = useAtContractNotes({
    atContractId: contract.atContractId,
    contratoId: contract.id,
    initialNotes: contract.atNotes,
    initialEvents: contract.atEvents,
    initialDocuments: contract.atDocuments,
    initialEmails: contract.atEmails,
    initialStatusNote: contract.atStatusNote,
    initialIncidentAt: contract.atIncidentAt,
  })

  useLayoutEffect(() => {
    const openFrame = requestAnimationFrame(() => setIsOpen(true))
    const notasFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowNotas(true))
    })
    return () => {
      cancelAnimationFrame(openFrame)
      cancelAnimationFrame(notasFrame)
    }
  }, [])

  useEffect(() => {
    setActiveTab("contrato")
    setShowNotas(true)
  }, [contract.id])

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  function requestClose() {
    setShowNotas(false)
    setIsOpen(false)
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(onClose, PANEL_MS)
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <>
      <div
        role="presentation"
        aria-hidden
        onClick={requestClose}
        className={`fixed inset-0 z-[100] bg-black/40 transition-opacity ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${BACKDROP_MS}ms` }}
      />
      <aside
        onClick={(event) => event.stopPropagation()}
        aria-label={`Detalle contrato ${displayId}`}
        className={`fixed top-0 right-0 bottom-0 z-[101] flex h-full w-full max-w-[min(1080px,82vw)] flex-col border-l border-brand-border bg-brand-panel shadow-2xl transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionDuration: `${PANEL_MS}ms` }}
      >
        <header className="shrink-0 border-b border-brand-border bg-brand-panel/95 px-5 py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-brand-text tracking-tight font-display">
                  Detalle contrato {displayId}
                </h2>
                <p className="text-xs text-brand-subtext truncate mt-0.5">{contract.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={requestClose}
                className="p-2 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-bg transition-colors cursor-pointer"
                aria-label="Cerrar detalle del contrato"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 px-3 py-2">
              <dt className="text-[9px] font-mono uppercase text-brand-subtext tracking-wide">CUPS</dt>
              <dd className="font-mono text-brand-text mt-0.5 break-all">{contract.cups || "—"}</dd>
            </div>
            <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 px-3 py-2">
              <dt className="text-[9px] font-mono uppercase text-brand-subtext tracking-wide">DNI</dt>
              <dd className="font-mono text-brand-text mt-0.5">{contract.nif || "—"}</dd>
            </div>
            <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 px-3 py-2">
              <dt className="text-[9px] font-mono uppercase text-brand-subtext tracking-wide">Tarifa</dt>
              <dd className="text-brand-text mt-0.5 break-words">{contract.tarifa || "—"}</dd>
            </div>
            <div className="rounded-lg border border-brand-border/70 bg-brand-bg/40 px-3 py-2">
              <dt className="text-[9px] font-mono uppercase text-brand-subtext tracking-wide">Creación</dt>
              <dd className="font-mono text-brand-text mt-0.5 tabular-nums">
                {formatActivationDate(contract.createdAt)}
              </dd>
            </div>
          </dl>
        </header>

        <div className="flex flex-1 min-h-0">
          <ContratoDetalleSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 min-w-0 overflow-y-auto p-6 bg-brand-bg/30">
            {renderActiveTab(activeTab, contract, {
              comercialEmail,
              profiles,
              formatCurrency,
              renderCompaniaLogo,
              activeUserId,
              activeUserName,
              onContractUpdated,
              atStatusNote: atExtras.statusNote,
              atIncidentAt: atExtras.incidentAt,
              atNotes: atExtras.notes,
              atEvents: atExtras.events,
              atDocuments: atExtras.documents,
              atEmails: atExtras.emails,
              atNotesLoading: atExtras.loading,
            })}
          </main>
          {showNotas ? (
            <ContratoNotasPanel
              contratoId={contract.id}
              estadoContrato={contract.estado}
              activeUserId={activeUserId}
              activeUserName={activeUserName}
              atNotes={atExtras.notes}
              atNotesLoading={atExtras.loading}
            />
          ) : (
            <div className="hidden w-72 shrink-0 border-l border-brand-border bg-brand-panel/50 xl:block" />
          )}
        </div>
      </aside>
    </>,
    document.body
  )
}
