import { useEffect, useLayoutEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
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

const BACKDROP_TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const }
const PANEL_TRANSITION = { duration: 0.24, ease: [0.32, 0.72, 0, 1] as const }

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
  const [isPresent, setIsPresent] = useState(true)
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

  useEffect(() => {
    setIsPresent(true)
    setActiveTab("contrato")
  }, [contract.id])

  useLayoutEffect(() => {
    if (!isPresent) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isPresent])

  function requestClose() {
    setIsPresent(false)
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {isPresent ? (
        <>
          <motion.div
            key="contrato-detalle-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_TRANSITION}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
            onClick={requestClose}
            aria-hidden
          />
          <motion.aside
            key="contrato-detalle-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={PANEL_TRANSITION}
            onClick={(event) => event.stopPropagation()}
            className="fixed top-0 right-0 bottom-0 z-[101] flex h-full w-full max-w-[min(1080px,82vw)] flex-col border-l border-brand-border bg-brand-panel shadow-2xl will-change-transform"
            aria-label={`Detalle contrato ${displayId}`}
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
              <ContratoNotasPanel
                contratoId={contract.id}
                estadoContrato={contract.estado}
                activeUserId={activeUserId}
                activeUserName={activeUserName}
                atNotes={atExtras.notes}
                atNotesLoading={atExtras.loading}
              />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
