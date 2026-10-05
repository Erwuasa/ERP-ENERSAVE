import { useState, type MutableRefObject, ReactNode } from "react"
import { Flame, Lightbulb, SquarePen, Trash2 } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
  formatPenalizacionFormula,
} from "@/lib/contract-penalty"
import {
  aplicaPenalizacionCincoPorCiento,
  getContractActivationDate,
  getRenewalSchedule,
} from "@/lib/contract-segment-rules"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { isRenovacionProxima } from "@/lib/contract-renewal"
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
import { ContratosTableSkeleton } from "@/components/ui/skeletons/VentasSkeletons"
import { canUserDeleteContract } from "@/lib/contract-deletion"
import { isContractDeletable } from "@/lib/contract-registration"
import { canUserMutateContract } from "@/lib/contract-visibility"
import { ContractQuickActionButton } from "@/components/contratos/ContractQuickActionButton"
import { TarifaRecommendationPopover } from "@/components/TarifaRecommendationPopover"
import { RenovacionProximaPopover } from "@/components/RenovacionProximaPopover"
import { contractHasActiveRenewalAlert } from "@/lib/renewal-alert-dismissed"
import { TABLE_ROW_SELECTED } from "@/lib/enersave-ui-theme"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import { resolveContractCompaniaForDisplay } from "@/lib/resolve-contract-compania"
import { formatContratoOperacionTableHint } from "@/components/contratos/contrato-detalle-utils"
import {
  CONTRACTS_TD,
  CONTRACTS_TD_LEFT,
  CONTRACTS_TD_MIDDLE,
  CONTRACTS_TH,
  CONTRACTS_TH_SUB,
  CONTRACTS_TH_SUB_SPACER,
  CONTRACT_TABLE_ROW_HEIGHT_CLASS,
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
  onEditDraft?: (contract: Contract) => void
  renderCompaniaLogo?: (brandName: string) => ReactNode
  showComercialColumn?: boolean
  /** Mantiene la columna Comercial aunque el filtro no la necesite (evita saltos de layout). */
  stableComercialColumn?: boolean
  /** Transición optimista al cambiar filtros de usuario/equipo. */
  isFilterPending?: boolean
  /** True while the initial contracts fetch is in flight and there's nothing to show yet. */
  loading?: boolean
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
  onEditDraft,
  renderCompaniaLogo,
  showComercialColumn,
  stableComercialColumn = false,
  isFilterPending = false,
  loading = false,
}: Props) {
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [openRenewalId, setOpenRenewalId] = useState<string | null>(null)

  const showOwnerColumn =
    stableComercialColumn || showComercialColumn === true || activeRole === "superadmin"
  const showDeleteColumn = Boolean(onRequestDelete)
  const columnCount = (showOwnerColumn ? 10 : 9) + (showDeleteColumn ? 1 : 0)

  function handleRowClick(event: React.MouseEvent<HTMLTableRowElement>, contract: Contract) {
    if (!onOpenDetalle) return
    const target = event.target as HTMLElement
    if (target.closest("button, input, a, select, [data-no-row-open]")) return
    onOpenDetalle(contract)
  }

  if (loading && rows.length === 0) {
    return <ContratosTableSkeleton rows={6} />
  }

  const emptyMessage =
    contractsListFilter === "renovacion_proxima"
      ? "No hay contratos con renovación próxima."
      : contractsListFilter === "con_recomendacion"
        ? "No hay contratos con recomendación tarifaria."
        : contractsListFilter === "creados_este_mes"
          ? "No hay contratos creados este mes."
          : contractsListFilter === "bajas_este_mes"
            ? "No hay bajas registradas este mes."
            : contractsListFilter === "pipeline_en_proceso"
              ? "No hay contratos en proceso."
              : contractsListFilter === "pipeline_bajas"
                ? "No hay contratos dados de baja."
                : contractsListFilter === "pipeline_ko"
                  ? "No hay contratos KO (firma caducada)."
                  : isContractEstadoKpiFilter(contractsListFilter)
                    ? `No hay contratos en estado «${contractsListFilterLabel(contractsListFilter).replace(/^ · /, "")}».`
                    : "No hay contratos que coincidan con la búsqueda."

  return (
    <div
      className={`h-full min-h-[12rem] min-w-0 overflow-x-auto transition-opacity duration-150 ${
        isFilterPending ? "opacity-70" : "opacity-100"
      }`}
    >
      <table className="w-full min-w-[1120px] table-fixed text-left text-[11px] leading-snug">
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          {showOwnerColumn ? <col style={{ width: "6%" }} /> : null}
          {showDeleteColumn ? <col style={{ width: "44px" }} /> : null}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-brand-surface/95 backdrop-blur-sm">
          <tr>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Estado</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
            </th>
            <th className={`${CONTRACTS_TH} text-left`}>
              <span className="block">Cliente</span>
              <span className={CONTRACTS_TH_SUB}>CUPS · NIF</span>
            </th>
            <th className={`${CONTRACTS_TH} text-left`}>
              <span className="block">Compañía</span>
              <span className={CONTRACTS_TH_SUB}>Tarifa</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Creación</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Activación</span>
              <span className={CONTRACTS_TH_SUB}>Renovación</span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>
              <span className="block">Potencia</span>
              <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                ·
              </span>
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
            {showOwnerColumn ? (
              <th className={`${CONTRACTS_TH} text-center`}>
                <span className="block">Comercial</span>
                <span className={CONTRACTS_TH_SUB_SPACER} aria-hidden>
                  ·
                </span>
              </th>
            ) : null}
            {showDeleteColumn ? (
              <th className={`${CONTRACTS_TH} text-center`} aria-label="Eliminar">
                <span className="sr-only">Eliminar</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/60 bg-brand-panel">
          {rows.length === 0 ? (
            <tr className={CONTRACT_TABLE_ROW_HEIGHT_CLASS}>
              <td
                colSpan={columnCount}
                className="px-4 py-10 text-center font-mono text-xs text-brand-subtext align-middle"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {rows.map((c) => {
            const renewal = getRenewalSchedule(c)
            const dias = renewal.diasRenovacion ?? 0
            const activationDate = getContractActivationDate(c)
            const showRenewalCountdown = renewal.estadoRenovacion !== "No aplica"
            const aplicaPenalizacion = aplicaPenalizacionCincoPorCiento(c)
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
            const canMutate = canUserMutateContract(c, activeRole, activeUserId)
            const cellReadOnly = { readOnly: !canMutate }
            const operacionHint = formatContratoOperacionTableHint(c)

            return (
              <tr
                key={c.id}
                ref={(el) => {
                  rowRefs.current[c.id] = el
                }}
                onClick={(event) => handleRowClick(event, c)}
                className={`${CONTRACT_TABLE_ROW_HEIGHT_CLASS} transition-colors duration-200 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-brand-elevated/40 ${
                  onOpenDetalle ? "cursor-pointer" : ""
                } ${
                  isHighlighted
                    ? TABLE_ROW_SELECTED
                    : isIncompleteRow
                      ? "bg-slate-300/20 dark:bg-slate-700/30"
                      : ""
                }`}
              >
                <td className={`${CONTRACTS_TD} relative`}>
                  <div
                    className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} min-w-0 flex-col items-center justify-center`}
                  >
                    {renderEstadoCell(c)}
                  </div>
                  {(onEditDraft &&
                      canMutate &&
                      normalizeContractEstado(c.estado) === CONTRACT_ESTADO_INCOMPLETO) ||
                    (showTarifaRecommendations && tarifaRecommendations?.has(c.id)) ||
                    contractHasActiveRenewalAlert(c.id, isRenovacionProxima(c)) ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0.5 flex items-center justify-center gap-1">
                      <div className="pointer-events-auto flex items-center justify-center gap-1">
                    {onEditDraft &&
                    canMutate &&
                    normalizeContractEstado(c.estado) === CONTRACT_ESTADO_INCOMPLETO ? (
                      <ContractQuickActionButton
                        tone="edit"
                        title="Completar borrador"
                        ariaLabel={`Completar borrador ${c.clientName}`}
                        onClick={() => onEditDraft(c)}
                      >
                        <SquarePen aria-hidden />
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
                    </div>
                  ) : null}
                </td>
                <td className={CONTRACTS_TD_LEFT}>
                  <div
                    className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} min-w-0 flex-col justify-center overflow-hidden gap-0.5`}
                  >
                    <p className="break-words font-semibold leading-snug text-brand-text line-clamp-1">
                      {renderEditableCell(c, "clientName", { placeholder: "Cliente", ...cellReadOnly })}
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[10px] text-cyan-600 dark:text-cyan-400 line-clamp-1">
                      {renderEditableCell(c, "cups", {
                        placeholder: "CUPS",
                        className: "font-mono",
                        ...cellReadOnly,
                      })}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-brand-subtext line-clamp-1">
                      {renderEditableCell(c, "nif", { placeholder: "NIF/CIF", ...cellReadOnly })}
                    </p>
                    <p
                      className={`text-[9px] font-mono line-clamp-1 ${
                        operacionHint
                          ? "text-cyan-700 dark:text-cyan-400"
                          : "invisible select-none"
                      }`}
                      title={operacionHint ?? undefined}
                    >
                      {operacionHint ?? "·"}
                    </p>
                  </div>
                </td>
                <td className={CONTRACTS_TD_LEFT}>
                  <div
                    className={`grid ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5 overflow-hidden`}
                  >
                    <div className="flex min-w-0 flex-col items-center justify-center gap-0.5">
                      <div className="flex h-8 shrink-0 items-center justify-center">
                        {renderCompaniaLogo ? (
                          renderCompaniaLogo(
                            resolveContractCompaniaForDisplay({
                              compania: c.compania,
                              tarifa: c.tarifa,
                            })
                          )
                        ) : (
                          <span className="max-w-full truncate text-center text-[10px] font-medium text-brand-text">
                            {resolveContractCompaniaForDisplay({
                              compania: c.compania,
                              tarifa: c.tarifa,
                            })}
                          </span>
                        )}
                      </div>
                      <p
                        className="w-full min-w-0 truncate text-center font-mono text-[10px] text-brand-subtext leading-snug"
                        title={c.tarifa?.trim() || undefined}
                      >
                        {renderEditableCell(c, "tarifa", {
                          ...cellReadOnly,
                          className: "truncate block max-w-full text-center",
                        })}
                      </p>
                    </div>
                    <div className="flex h-full items-center justify-center self-center">
                      <ContractSupplyTypeIcon tipo={c.tipo} />
                    </div>
                  </div>
                </td>
                <td className={CONTRACTS_TD}>
                  <div
                    className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} flex-col items-center justify-center overflow-hidden`}
                  >
                    <p className="font-mono text-[10px] font-semibold tabular-nums text-brand-text leading-snug">
                      {c.createdAt ? formatActivationDate(String(c.createdAt)) : <TableEmptyDash />}
                    </p>
                  </div>
                </td>
                <td className={CONTRACTS_TD}>
                  <div
                    className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} flex-col items-center justify-center gap-0.5 overflow-hidden`}
                  >
                    <p className="font-mono text-[10px] font-semibold tabular-nums text-brand-text leading-snug">
                      {activationDate ? (
                        formatActivationDate(activationDate)
                      ) : (
                        <TableEmptyDash />
                      )}
                    </p>
                    <p
                      className={`font-mono text-[9px] tabular-nums leading-tight ${
                        showRenewalCountdown ? "text-brand-subtext" : "invisible"
                      }`}
                    >
                      {showRenewalCountdown ? `${dias} d restantes` : "0 d restantes"}
                    </p>
                    <span
                      className={`inline-block rounded px-1 py-0.5 text-[7px] font-mono font-bold leading-none ${
                        showRenewalCountdown && renewal.estadoRenovacion === "Renovacion proxima"
                          ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          : "invisible"
                      }`}
                    >
                      Próxima
                    </span>
                  </div>
                </td>
                <td className={`${CONTRACTS_TD_MIDDLE} font-mono text-brand-text`}>
                  <div className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center`}>
                    <p className="tabular-nums">
                      {c.potenciaContratada ? (
                        formatPotenciaContratadaDisplay(c.potenciaContratada)
                      ) : (
                        <TableEmptyDash />
                      )}
                    </p>
                  </div>
                </td>
                <td className={`${CONTRACTS_TD} max-w-0`}>
                  <div
                    className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} flex-col items-center justify-center gap-0.5 overflow-hidden`}
                  >
                    <p className="truncate w-full text-[9px] leading-snug text-brand-subtext">
                      {renderEditableCell(c, "direccionSuministro", cellReadOnly)}
                    </p>
                    <p className="truncate w-full font-mono text-[10px] text-brand-text">
                      {renderEditableCell(c, "iban", cellReadOnly)}
                    </p>
                  </div>
                </td>
                <td className={`${CONTRACTS_TD_MIDDLE} font-mono tabular-nums`}>
                  <div className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center`}>
                    {consumoTabla != null
                      ? `${Number(consumoTabla).toLocaleString("es-ES")} kWh`
                      : <TableEmptyDash />}
                  </div>
                </td>
                <td className={CONTRACTS_TD}>
                  {!aplicaPenalizacion ? (
                    <div className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center`}>
                      <span className="font-mono text-[9px] text-brand-subtext">No aplica</span>
                    </div>
                  ) : penalizacion != null &&
                    c.precioFijoConsumo != null &&
                    consumoTabla != null &&
                    consumoTabla > 0 ? (
                    <div
                      className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} flex-col items-center justify-center gap-0.5 overflow-hidden`}
                    >
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatPenalizacionDisplay(penalizacion)}
                      </p>
                      <p
                        className="text-[8px] font-mono leading-tight text-brand-subtext text-center"
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
                    <div className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center`}>
                      <TableEmptyDash />
                    </div>
                  )}
                </td>
                {showOwnerColumn ? (
                  <td className={`${CONTRACTS_TD} font-medium text-brand-text overflow-hidden`}>
                    <div
                      className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center px-1`}
                    >
                      <span className="line-clamp-1 w-full text-center text-[10px] leading-tight">
                        {renderEditableCell(c, "comercialName", cellReadOnly)}
                      </span>
                    </div>
                  </td>
                ) : null}
                {showDeleteColumn ? (
                  <td className={`${CONTRACTS_TD} text-center`} data-no-row-open>
                    <div className={`flex ${CONTRACT_TABLE_ROW_HEIGHT_CLASS} items-center justify-center`}>
                      {isContractDeletable(c) &&
                      canUserDeleteContract(c, activeRole, activeUserId) ? (
                        <ContractQuickActionButton
                          tone="danger"
                          title="Eliminar borrador"
                          ariaLabel={`Eliminar borrador ${c.clientName}`}
                          onClick={() => onRequestDelete?.(c)}
                        >
                          <Trash2 aria-hidden />
                        </ContractQuickActionButton>
                      ) : (
                        <TableEmptyDash />
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
