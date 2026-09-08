import { useState, type MutableRefObject, ReactNode } from "react"
import { Flame, Lightbulb, Trash2 } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
  formatPenalizacionFormula,
} from "@/lib/contract-penalty"
import {
  aplicaPenalizacionCincoPorCiento,
  getContractActivationDate,
  getNibaRenovacionComisionPct,
  getRenewalSchedule,
} from "@/lib/contract-segment-rules"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { isRenovacionProxima } from "@/lib/contract-renewal"
import { formatAtPricesInline } from "@/components/contratos/contrato-tarifa-marco-view"
import { formatPotenciaContratadaDisplay } from "@/lib/contract-registration"
import {
  contractsListFilterLabel,
  isContractEstadoKpiFilter,
} from "@/lib/contract-estado-kpis"
import {
  CONTRACT_ESTADO_INCOMPLETO,
  normalizeContractEstado,
} from "@/lib/contract-estado"
import type { useEditableCell } from "@/hooks/use-editable-cell"
import { canUserDeleteContract } from "@/lib/contract-deletion"
import { ContractQuickActionButton } from "@/components/contratos/ContractQuickActionButton"
import { TarifaRecommendationPopover } from "@/components/TarifaRecommendationPopover"
import { RenovacionProximaPopover } from "@/components/RenovacionProximaPopover"
import { contractHasActiveRenewalAlert } from "@/lib/renewal-alert-dismissed"
import { TABLE_ROW_SELECTED } from "@/lib/enersave-ui-theme"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import {
  CONTRACTS_TD,
  CONTRACTS_TD_MIDDLE,
  CONTRACTS_TH,
  CONTRACTS_TH_SUB,
  CONTRACTS_TH_SUB_SPACER,
  formatActivationDate,
  mesesFraccionRenovacion,
} from "@/pages/erp/contratos/components/contratos-panel-utils"

type RenderEditableCell = ReturnType<typeof useEditableCell<Contract>>["renderEditableCell"]

type Props = {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  rows: Contract[]
  filtered: Contract[]
  contractsListFilter: ContractsListFilter
  highlightContractId?: string | null
  rowRefs: MutableRefObject<Record<string, HTMLTableRowElement | null>>
  renderEstadoCell: (c: Contract) => ReactNode
  renderEditableCell: RenderEditableCell
  onRequestDelete?: (contract: Contract) => void
  formatCurrency?: (val: number) => string
  showTarifaRecommendations?: boolean
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  onCreateFromRecommendation?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDownloadRecommendationPdf?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDismissRecommendation?: (contractId: string) => void
  onDismissRenewalAlert?: (contractId: string) => void
  onOpenDetalle?: (contract: Contract) => void
}

function ContractSupplyTypeIcon({ tipo }: { tipo: Contract["tipo"] }) {
  const isLuz = tipo === "luz"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-0.5 ${
        isLuz ? "text-cyan-600 dark:text-cyan-400" : "text-orange-600 dark:text-orange-500"
      }`}
      title={isLuz ? "Luz" : "Gas"}
      aria-label={isLuz ? "Suministro de luz" : "Suministro de gas"}
    >
      {isLuz ? <Lightbulb className="h-3.5 w-3.5" /> : <Flame className="h-3.5 w-3.5" />}
    </span>
  )
}

function TableEmptyDash({ align = "center" }: { align?: "left" | "center" | "right" }) {
  const alignClass =
    align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center"
  return <span className={`block w-full ${alignClass} font-mono text-brand-subtext`}>—</span>
}

export function ContratosPanelTable({
  activeRole,
  activeUserId,
  rows,
  filtered,
  contractsListFilter,
  highlightContractId,
  rowRefs,
  renderEstadoCell,
  renderEditableCell,
  onRequestDelete,
  formatCurrency = (val) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val),
  showTarifaRecommendations = false,
  tarifaRecommendations,
  onCreateFromRecommendation,
  onDownloadRecommendationPdf,
  onDismissRecommendation,
  onDismissRenewalAlert,
  onOpenDetalle,
}: Props) {
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [openRenewalId, setOpenRenewalId] = useState<string | null>(null)

  const showComercialColumn = activeRole === "superadmin"

  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, contract: Contract) {
    if (!onOpenDetalle) return
    const target = event.target as HTMLElement
    if (target.closest("button, input, a, select, [data-no-row-open]")) return
    onOpenDetalle(contract)
  }

  return (
    <div className="h-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[1120px] table-fixed text-left text-[11px] leading-snug">
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          {showComercialColumn ? <col style={{ width: "6%" }} /> : null}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-brand-surface/95 backdrop-blur-sm">
          <tr>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Estado</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
            </th>
            <th className={CONTRACTS_TH}>
              <span className="block">Cliente</span>
              <span className={CONTRACTS_TH_SUB}>CUPS · NIF</span>
            </th>
            <th className={CONTRACTS_TH}>
              <span className="block">Compañía</span>
              <span className={CONTRACTS_TH_SUB}>Tarifa</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Activación</span>
              <span className={CONTRACTS_TH_SUB}>Renovación</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Potencia</span>
              <span className={CONTRACTS_TH_SUB}>Precio kWh</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Dirección</span>
              <span className={CONTRACTS_TH_SUB}>IBAN</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Consumo</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Penalización</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
            </th>
            {showComercialColumn ? (
              <th className={CONTRACTS_TH}>
                <span className="block">Comercial</span>
                <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                  ·
                </span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/60 bg-brand-panel">
          {rows.map((c) => {
            const renewal = getRenewalSchedule(c)
            const dias = renewal.diasRenovacion ?? 0
            const activationDate = getContractActivationDate(c)
            const preciosInline = formatAtPricesInline(c.atPrices, c.atAccessTariff || c.atr)
            const showRenewalCountdown = renewal.estadoRenovacion !== "No aplica"
            const aplicaPenalizacion = aplicaPenalizacionCincoPorCiento(c)
            const nibaRenovPct = getNibaRenovacionComisionPct(c)
            const consumoTabla = c.consumoAnualManual ?? (c.consumoAnual > 0 ? c.consumoAnual : null)
            const penalizacion = calcularPenalizacion({
              tipoCliente: c.tipoCliente,
              compania: c.compania,
              clientName: c.clientName,
              nif: c.nif,
              precioFijoConsumo: c.precioFijoConsumo,
              consumoAnual: consumoTabla ?? undefined,
              diasHastaRenovacion: aplicaPenalizacion ? dias : undefined,
            })

            const isHighlighted = highlightContractId === c.id
            const isIncompleteRow =
              normalizeContractEstado(c.estado) === CONTRACT_ESTADO_INCOMPLETO

            return (
              <tr
                key={c.id}
                ref={(el) => {
                  rowRefs.current[c.id] = el
                }}
                onClick={(event) => handleRowClick(event, c)}
                className={`transition-colors duration-200 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-brand-elevated/40 ${
                  onOpenDetalle ? "cursor-pointer" : ""
                } ${
                  isHighlighted
                    ? TABLE_ROW_SELECTED
                    : isIncompleteRow
                      ? "bg-slate-300/20 dark:bg-slate-700/30"
                      : ""
                }`}
              >
                <td className={`${CONTRACTS_TD} overflow-hidden text-center`}>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex w-full min-w-0 justify-center">{renderEstadoCell(c)}</div>
                    {(onRequestDelete && canUserDeleteContract(c, activeRole, activeUserId)) ||
                    (showTarifaRecommendations && tarifaRecommendations?.has(c.id)) ||
                    contractHasActiveRenewalAlert(c.id, isRenovacionProxima(c)) ? (
                      <div className="flex flex-col items-center gap-1">
                    {onRequestDelete && canUserDeleteContract(c, activeRole, activeUserId) ? (
                      <ContractQuickActionButton
                        tone="danger"
                        title="Eliminar borrador"
                        ariaLabel={`Eliminar borrador ${c.clientName}`}
                        onClick={() => onRequestDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ContractQuickActionButton>
                    ) : null}
                    {showTarifaRecommendations && tarifaRecommendations?.has(c.id) ? (
                      <TarifaRecommendationPopover
                        contract={c}
                        recommendation={tarifaRecommendations.get(c.id)!}
                        open={openRecId === c.id}
                        onToggle={() => setOpenRecId((prev) => (prev === c.id ? null : c.id))}
                        onClose={() => setOpenRecId(null)}
                        onCreateContract={() => {
                          const rec = tarifaRecommendations.get(c.id)
                          if (!rec) return
                          setOpenRecId(null)
                          onCreateFromRecommendation?.(c, rec)
                        }}
                        onDownloadPdf={() => {
                          const rec = tarifaRecommendations.get(c.id)
                          if (!rec) return
                          void onDownloadRecommendationPdf?.(c, rec)
                        }}
                        onDismiss={() => {
                          setOpenRecId(null)
                          onDismissRecommendation?.(c.id)
                        }}
                        formatCurrency={formatCurrency}
                      />
                    ) : null}
                    {contractHasActiveRenewalAlert(c.id, isRenovacionProxima(c)) ? (
                      <RenovacionProximaPopover
                        contract={c}
                        fechaRenovacion={renewal.fechaRenovacion ?? "—"}
                        diasRestantes={dias}
                        open={openRenewalId === c.id}
                        onToggle={() =>
                          setOpenRenewalId((prev) => (prev === c.id ? null : c.id))
                        }
                        onClose={() => setOpenRenewalId(null)}
                        onDismiss={() => {
                          setOpenRenewalId(null)
                          onDismissRenewalAlert?.(c.id)
                        }}
                      />
                    ) : null}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className={`${CONTRACTS_TD} overflow-hidden`}>
                  <p className="break-words font-semibold leading-snug text-brand-text">
                    {renderEditableCell(c, "clientName", { placeholder: "Cliente" })}
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                    {renderEditableCell(c, "cups", {
                      placeholder: "CUPS",
                      className: "font-mono",
                    })}
                  </p>
                  <p className="mt-1 font-mono text-[9px] text-brand-subtext">
                    {renderEditableCell(c, "nif", { placeholder: "NIF/CIF" })}
                  </p>
                </td>
                <td className={`${CONTRACTS_TD} overflow-hidden`}>
                  <div className="flex items-start justify-between gap-1">
                    <p className="min-w-0 flex-1 break-words font-medium leading-snug text-brand-text">
                      {renderEditableCell(c, "compania")}
                    </p>
                    <ContractSupplyTypeIcon tipo={c.tipo} />
                  </div>
                  <p className="mt-1 break-words font-mono text-[10px] text-brand-subtext">
                    {renderEditableCell(c, "tarifa")}
                  </p>
                  {preciosInline ? (
                    <p className="mt-1 font-mono text-[9px] leading-snug text-brand-subtext">
                      {preciosInline}
                    </p>
                  ) : null}
                </td>
                <td className={`${CONTRACTS_TD} text-center`}>
                  <p className="font-mono text-[10px] font-semibold tabular-nums text-brand-text leading-snug">
                    {activationDate || c.createdAt ? (
                      formatActivationDate(activationDate ?? String(c.createdAt))
                    ) : (
                      <TableEmptyDash />
                    )}
                  </p>
                  {showRenewalCountdown ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="font-mono text-[9px] tabular-nums text-brand-subtext">
                        {dias} d restantes
                      </p>
                      {renewal.estadoRenovacion === "Renovacion proxima" && (
                        <span className="inline-block rounded bg-violet-500/10 px-1 py-0.5 text-[7px] font-mono font-bold text-violet-700 dark:text-violet-300">
                          Próxima
                        </span>
                      )}
                      {nibaRenovPct != null && (
                        <p className="text-[7px] font-mono text-cyan-700 dark:text-cyan-300">
                          Renov. {nibaRenovPct}%
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1">
                      <TableEmptyDash />
                    </p>
                  )}
                </td>
                <td className={`${CONTRACTS_TD} text-center font-mono text-brand-text`}>
                  <p className="tabular-nums">
                    {c.potenciaContratada ? (
                      formatPotenciaContratadaDisplay(c.potenciaContratada)
                    ) : (
                      <TableEmptyDash />
                    )}
                  </p>
                  <p className="mt-1 tabular-nums text-[10px] text-brand-subtext">
                    {c.precioFijoConsumo != null && Number(c.precioFijoConsumo) > 0
                      ? `${Number(c.precioFijoConsumo).toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })} €/kWh`
                      : <TableEmptyDash />}
                  </p>
                </td>
                <td className={`${CONTRACTS_TD} max-w-0 text-center`}>
                  <p className="truncate text-[9px] leading-snug text-brand-subtext">
                    {renderEditableCell(c, "direccionSuministro")}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-brand-text">
                    {renderEditableCell(c, "iban")}
                  </p>
                </td>
                <td className={`${CONTRACTS_TD_MIDDLE} text-center font-mono tabular-nums`}>
                  {consumoTabla != null
                    ? `${Number(consumoTabla).toLocaleString("es-ES")} kWh`
                    : <TableEmptyDash />}
                </td>
                <td className={`${CONTRACTS_TD} text-center`}>
                  {!aplicaPenalizacion ? (
                    <div className="flex min-h-[2.5rem] items-center justify-center">
                      <span className="font-mono text-[9px] text-brand-subtext">No aplica</span>
                    </div>
                  ) : penalizacion != null &&
                    c.precioFijoConsumo != null &&
                    consumoTabla != null &&
                    consumoTabla > 0 ? (
                    <div>
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatPenalizacionDisplay(penalizacion)}
                      </p>
                      <p
                        className="mt-0.5 text-[8px] font-mono leading-tight text-brand-subtext"
                        title="Penalización 5% · PYME/autónomo"
                      >
                        {formatPenalizacionFormula(
                          c.precioFijoConsumo,
                          consumoTabla,
                          dias
                        )}{" "}
                        × ({mesesFraccionRenovacion(dias)})
                      </p>
                    </div>
                  ) : (
                    <TableEmptyDash />
                  )}
                </td>
                {showComercialColumn ? (
                  <td className={`${CONTRACTS_TD} font-medium text-brand-text`}>
                    {renderEditableCell(c, "comercialName")}
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="py-8 text-center font-mono text-xs text-brand-subtext">
          {contractsListFilter === "renovacion_proxima"
            ? "No hay contratos con renovación próxima."
            : contractsListFilter === "con_recomendacion"
              ? "No hay contratos con recomendación tarifaria."
              : contractsListFilter === "creados_este_mes"
                ? "No hay contratos creados este mes."
                : contractsListFilter === "bajas_este_mes"
                  ? "No hay bajas registradas este mes."
                  : isContractEstadoKpiFilter(contractsListFilter)
                    ? `No hay contratos en estado «${contractsListFilterLabel(contractsListFilter).replace(/^ · /, "")}».`
                    : "No hay contratos que coincidan con la búsqueda."}
        </p>
      )}
    </div>
  )
}
