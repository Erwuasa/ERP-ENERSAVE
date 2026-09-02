import { useState, type Dispatch, MutableRefObject, ReactNode, SetStateAction } from "react"
import { Flame, Info, Lightbulb, Trash2, Zap } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
  formatPenalizacionFormula,
} from "@/lib/contract-penalty"
import {
  aplicaRenovacionAnual,
  aplicaPenalizacionCincoPorCiento,
  getNibaRenovacionComisionPct,
  getRenewalSchedule,
} from "@/lib/contract-segment-rules"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { isRenovacionProxima } from "@/lib/contract-renewal"
import {
  contractsListFilterLabel,
  isContractEstadoKpiFilter,
} from "@/lib/contract-estado-kpis"
import {
  canActivateContract,
  canBajaContract,
  CONTRACT_ESTADO_INCOMPLETO,
  normalizeContractEstado,
} from "@/lib/contract-estado"
import type { useEditableCell } from "@/hooks/use-editable-cell"
import { canUserDeleteContract } from "@/lib/contract-deletion"
import { ContractQuickActionButton } from "@/components/contratos/ContractQuickActionButton"
import { TarifaRecommendationPopover } from "@/components/TarifaRecommendationPopover"
import { RenovacionProximaPopover } from "@/components/RenovacionProximaPopover"
import { contractHasActiveRenewalAlert } from "@/lib/renewal-alert-dismissed"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import {
  CONTRACTS_TD,
  CONTRACTS_TH,
  formatActivationDate,
  mesesFraccionRenovacion,
} from "@/pages/erp/contratos/components/contratos-panel-utils"

type RenderEditableCell = ReturnType<typeof useEditableCell<Contract>>["renderEditableCell"]

export const CONTRATOS_PAGE_SIZE = 10

type Props = {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  canViewComisionDesglose: boolean
  paginated: Contract[]
  filtered: Contract[]
  contractsListFilter: ContractsListFilter
  highlightContractId?: string | null
  rowRefs: MutableRefObject<Record<string, HTMLTableRowElement | null>>
  renderEstadoCell: (c: Contract) => ReactNode
  renderEditableCell: RenderEditableCell
  selectedContractId: string | null
  setSelectedContractId: Dispatch<SetStateAction<string | null>>
  onActivateContract: (contract: Contract) => void
  onBajaContract: (contract: Contract) => void
  onRequestDelete?: (contract: Contract) => void
  formatCurrency?: (val: number) => string
  showTarifaRecommendations?: boolean
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  onCreateFromRecommendation?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDownloadRecommendationPdf?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDismissRecommendation?: (contractId: string) => void
  onDismissRenewalAlert?: (contractId: string) => void
}

export function ContratosPanelTable({
  activeRole,
  activeUserId,
  canViewComisionDesglose,
  paginated,
  filtered,
  contractsListFilter,
  highlightContractId,
  rowRefs,
  renderEstadoCell,
  renderEditableCell,
  selectedContractId,
  setSelectedContractId,
  onActivateContract,
  onBajaContract,
  onRequestDelete,
  formatCurrency = (val) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val),
  showTarifaRecommendations = false,
  tarifaRecommendations,
  onCreateFromRecommendation,
  onDownloadRecommendationPdf,
  onDismissRecommendation,
  onDismissRenewalAlert,
}: Props) {
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [openRenewalId, setOpenRenewalId] = useState<string | null>(null)
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border/60 bg-brand-surface/30">
      <table className="w-full min-w-[1240px] table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[118px]" />
          <col className="w-[17%]" />
          <col className="w-[82px]" />
          <col className="w-[14%]" />
          <col className="w-[108px]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[96px]" />
          <col className="w-[13%]" />
          {activeRole === "superadmin" && (
            <>
              <col className="w-[11%]" />
              <col className="w-[118px]" />
            </>
          )}
        </colgroup>
        <thead className="bg-brand-panel/80">
          <tr>
            <th className={`${CONTRACTS_TH} text-center`}>Estado</th>
            <th className={CONTRACTS_TH}>
              Cliente
              <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                CUPS · NIF
              </span>
            </th>
            <th className={`${CONTRACTS_TH} text-center`}>Segmento</th>
            <th className={CONTRACTS_TH}>
              Compañía
              <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                Tarifa
              </span>
            </th>
            <th className={CONTRACTS_TH}>
              Activación
              <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                Renovación
              </span>
            </th>
            <th className={CONTRACTS_TH}>
              Potencia
              <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                Precio kWh
              </span>
            </th>
            <th className={CONTRACTS_TH}>
              IBAN
              <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                Dirección
              </span>
            </th>
            <th className={`${CONTRACTS_TH} text-right`}>Consumo</th>
            <th className={CONTRACTS_TH}>Penalización</th>
            {activeRole === "superadmin" && (
              <>
                <th className={CONTRACTS_TH}>Comercial</th>
                <th className={`${CONTRACTS_TH} text-right`}>Acciones</th>
              </>
            )}
            {canViewComisionDesglose && activeRole !== "superadmin" && (
              <th className={`${CONTRACTS_TH} text-right`}>Ficha</th>
            )}
          </tr>
        </thead>
        <tbody className="min-h-[520px] divide-y divide-brand-border/50">
          {paginated.map((c) => {
            const renewal = getRenewalSchedule(c)
            const dias = renewal.diasRenovacion ?? 0
            const aplicaRenovacion = aplicaRenovacionAnual(c)
            const aplicaPenalizacion = aplicaPenalizacionCincoPorCiento(c)
            const nibaRenovPct = getNibaRenovacionComisionPct(c)
            const penalizacion = calcularPenalizacion({
              tipoCliente: c.tipoCliente,
              compania: c.compania,
              clientName: c.clientName,
              nif: c.nif,
              precioFijoConsumo: c.precioFijoConsumo,
              consumoAnual: c.consumoAnualManual ?? undefined,
              diasHastaRenovacion: aplicaPenalizacion ? dias : undefined,
            })
            const tipoPrecioLabel =
              c.tipoPrecio === "mercado"
                ? "Precio de mercado"
                : c.tipoPrecio === "fijo"
                  ? "Precio fijo"
                  : c.tarifa.toLowerCase().includes("index")
                    ? "Precio de mercado"
                    : "Precio fijo"

            const isHighlighted = highlightContractId === c.id
            const isIncompleteRow =
              normalizeContractEstado(c.estado) === CONTRACT_ESTADO_INCOMPLETO

            return (
              <tr
                key={c.id}
                ref={(el) => {
                  rowRefs.current[c.id] = el
                }}
                className={`hover:bg-brand-surface/60 transition-colors duration-200 ${
                  isHighlighted
                    ? "ring-2 ring-inset ring-cyan-500/50 bg-cyan-500/5"
                    : isIncompleteRow
                      ? "bg-slate-300/20 dark:bg-slate-700/30"
                      : ""
                }`}
              >
                <td className={`${CONTRACTS_TD} text-center`}>
                  <div className="flex justify-center items-start gap-1 flex-wrap">
                    {renderEstadoCell(c)}
                    {onRequestDelete &&
                    canUserDeleteContract(c, activeRole, activeUserId) ? (
                      <ContractQuickActionButton
                        tone="danger"
                        title="Eliminar borrador"
                        ariaLabel={`Eliminar borrador ${c.clientName}`}
                        onClick={() => onRequestDelete(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                </td>
                <td className={CONTRACTS_TD}>
                  <p className="font-semibold text-brand-text leading-snug break-words">
                    {renderEditableCell(c, "clientName", { placeholder: "Cliente" })}
                    {c.source === "at" ? (
                      <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                        AT{c.atStatus ? ` · ${c.atStatus}` : ""}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1 break-all">
                    {renderEditableCell(c, "cups", {
                      placeholder: "CUPS",
                      className: "font-mono",
                    })}
                  </p>
                  <p className="text-[9px] font-mono text-brand-subtext mt-1">
                    {renderEditableCell(c, "nif", { placeholder: "NIF/CIF" })}
                  </p>
                </td>
                <td className={`${CONTRACTS_TD} text-center`}>
                  {renderEditableCell(c, "tipo", {
                    display: (v) => (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          v === "luz"
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        }`}
                      >
                        {v === "luz" ? (
                          <Lightbulb className="w-3 h-3" />
                        ) : (
                          <Flame className="w-3 h-3" />
                        )}
                        {String(v).toUpperCase()}
                      </span>
                    ),
                  })}
                </td>
                <td className={CONTRACTS_TD}>
                  <p className="font-medium text-brand-text leading-snug break-words">
                    {renderEditableCell(c, "compania")}
                  </p>
                  <p className="text-[10px] font-mono text-brand-subtext mt-1 break-words">
                    {renderEditableCell(c, "tarifa")}
                  </p>
                  <p className="text-[9px] text-brand-subtext/90 mt-1">
                    {renderEditableCell(c, "tipoPrecio", {
                      placeholder: tipoPrecioLabel,
                      display: (v) =>
                        v === "mercado"
                          ? "Mercado"
                          : v === "fijo"
                            ? "Fijo"
                            : tipoPrecioLabel === "Precio de mercado"
                              ? "Mercado"
                              : "Fijo",
                    })}
                  </p>
                </td>
                <td className={CONTRACTS_TD}>
                  <p className="font-mono text-brand-text font-semibold tabular-nums">
                    {renderEditableCell(c, "createdAt", {
                      display: (v) => formatActivationDate(String(v || "")),
                    })}
                  </p>
                  {aplicaRenovacion ? (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[10px] font-mono text-brand-subtext tabular-nums">
                        {dias} d restantes
                      </p>
                      {renewal.estadoRenovacion === "Renovacion proxima" && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          Próxima
                        </span>
                      )}
                      {nibaRenovPct != null && (
                        <p className="text-[8px] font-mono text-cyan-700 dark:text-cyan-300">
                          Renov. {nibaRenovPct}%
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] font-mono text-brand-subtext mt-1.5">—</p>
                  )}
                </td>
                <td className={`${CONTRACTS_TD} font-mono text-brand-text`}>
                  <p className="tabular-nums">
                    {renderEditableCell(c, "potenciaContratada", {
                      display: (v) => (v != null && v !== "" ? `${v} kW` : "—"),
                    })}
                  </p>
                  <p className="text-[10px] text-brand-subtext mt-1 tabular-nums">
                    {renderEditableCell(c, "precioFijoConsumo", {
                      display: (v) =>
                        v != null && Number(v) > 0
                          ? `${Number(v).toFixed(4)} €/kWh`
                          : "—",
                    })}
                  </p>
                </td>
                <td className={CONTRACTS_TD}>
                  <p className="font-mono text-[10px] text-brand-text truncate">
                    {renderEditableCell(c, "iban", { placeholder: "—" })}
                  </p>
                  <p className="text-[9px] text-brand-subtext mt-1 line-clamp-2 leading-snug">
                    {renderEditableCell(c, "direccionSuministro", { placeholder: "—" })}
                  </p>
                </td>
                <td className={`${CONTRACTS_TD} text-right font-mono tabular-nums`}>
                  {renderEditableCell(c, "consumoAnualManual", {
                    display: (v) =>
                      v != null && Number(v) > 0
                        ? `${Number(v).toLocaleString("es-ES")} kWh`
                        : "—",
                  })}
                </td>
                <td className={CONTRACTS_TD}>
                  {!aplicaPenalizacion ? (
                    <span className="text-[9px] font-mono text-brand-subtext">No aplica</span>
                  ) : penalizacion != null &&
                    c.precioFijoConsumo != null &&
                    c.consumoAnualManual != null &&
                    c.consumoAnualManual > 0 ? (
                    <div>
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatPenalizacionDisplay(penalizacion)}
                      </p>
                      <p
                        className="text-[8px] font-mono text-brand-subtext mt-0.5 leading-tight"
                        title="Penalización 5% · PYME/autónomo"
                      >
                        {formatPenalizacionFormula(
                          c.precioFijoConsumo,
                          c.consumoAnualManual,
                          dias
                        )}{" "}
                        × ({mesesFraccionRenovacion(dias)})
                      </p>
                    </div>
                  ) : (
                    <span className="text-brand-subtext font-mono">—</span>
                  )}
                </td>
                {activeRole === "superadmin" && (
                  <>
                    <td className={`${CONTRACTS_TD} font-medium text-brand-text`}>
                      {renderEditableCell(c, "comercialName")}
                    </td>
                    <td className={`${CONTRACTS_TD} text-right`}>
                      <div className="flex flex-col items-end gap-1.5">
                        {canViewComisionDesglose && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedContractId((prev) => (prev === c.id ? null : c.id))
                            }
                            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                              selectedContractId === c.id
                                ? "border-cyan-500 bg-cyan-500/10 text-cyan-600"
                                : "border-brand-border text-brand-subtext hover:text-brand-text"
                            }`}
                          >
                            <Info className="w-3 h-3 inline mr-1" />
                            Ficha
                          </button>
                        )}
                        {canActivateContract(c.estado) ? (
                          <button
                            type="button"
                            onClick={() => onActivateContract(c)}
                            className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Zap className="w-3" />
                            <span>Activar & Repartir</span>
                          </button>
                        ) : canBajaContract(c.estado) ? (
                          <button
                            type="button"
                            onClick={() => onBajaContract(c)}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Dar de Baja</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 bg-slate-500/5 border border-slate-500/15 px-2 py-0.5 rounded text-[9px] font-mono font-medium shrink-0">
                            {normalizeContractEstado(c.estado)}
                          </span>
                        )}
                      </div>
                    </td>
                  </>
                )}
                {canViewComisionDesglose && activeRole !== "superadmin" && (
                  <td className={`${CONTRACTS_TD} text-right`}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedContractId((prev) => (prev === c.id ? null : c.id))
                      }
                      className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                        selectedContractId === c.id
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600"
                          : "border-brand-border text-brand-subtext hover:text-brand-text"
                      }`}
                    >
                      <Info className="w-3 h-3 inline mr-1" />
                      Ficha
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
          {paginated.length < CONTRATOS_PAGE_SIZE &&
            Array.from({ length: CONTRATOS_PAGE_SIZE - paginated.length }).map((_, i) => (
              <tr key={`pad-${i}`} className="h-[68px]" aria-hidden>
                <td
                  colSpan={
                    activeRole === "superadmin" ? 11 : canViewComisionDesglose ? 10 : 9
                  }
                  className={CONTRACTS_TD}
                />
              </tr>
            ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-center text-xs text-brand-subtext py-8 font-mono">
          {contractsListFilter === "renovacion_proxima"
            ? "No hay contratos con renovación próxima."
            : contractsListFilter === "con_recomendacion"
              ? "No hay contratos con recomendación tarifaria."
            : isContractEstadoKpiFilter(contractsListFilter)
              ? `No hay contratos en estado «${contractsListFilterLabel(contractsListFilter).replace(/^ · /, "")}».`
              : "No hay contratos que coincidan con la búsqueda."}
        </p>
      )}
    </div>
  )
}
