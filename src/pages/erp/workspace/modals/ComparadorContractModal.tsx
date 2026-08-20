import type { ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { User, Zap, FileText, Trash2, Lock, X } from "lucide-react"
import { FileDropZone } from "@/components/ui/FileDropZone"
import { companiesTariffsCatalog } from "@/data/tarifas-catalog"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

type Props = { ws: ErpWorkspaceContext }

export function ComparadorContractModal({ ws }: Props) {
  const {
    isContractModalOpen,
    setIsContractModalOpen,
    modalClientName,
    setModalClientName,
    modalNif,
    setModalNif,
    modalTelefono,
    setModalTelefono,
    modalEmail,
    setModalEmail,
    modalIban,
    setModalIban,
    modalDireccionCompleta,
    setModalDireccionCompleta,
    modalDireccionSuministro,
    setModalDireccionSuministro,
    modalCups,
    setModalCups,
    modalPotencia,
    setModalPotencia,
    modalPrecioFijoConsumo,
    setModalPrecioFijoConsumo,
    modalTipoPrecio,
    setModalTipoPrecio,
    modalFechaInicio,
    setModalFechaInicio,
    modalCompany,
    setModalCompany,
    modalTariff,
    setModalTariff,
    modalSegment,
    modalAccessTariff,
    modalFiles,
    setModalFiles,
    compTipo,
    setCompTipo,
    appendModalFiles,
    handleCreateContractFromModal,
  } = ws

  return (
    <AnimatePresence>
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsContractModalOpen(false)}
            className="fixed inset-0 bg-slate-950 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 bg-slate-50 dark:bg-[#0f182c] border-b border-slate-150 dark:border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-extrabold">
                  Emisión de Nueva Contratación
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Contrato Comercial • {modalClientName || "Cliente Detallado"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0c1222] text-slate-400 hover:text-slate-905 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateContractFromModal}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Datos Generales del Titular
                  </h3>

                  <ModalField label="Nombre o Razón Social" required>
                    <input
                      type="text"
                      required
                      value={modalClientName}
                      onChange={(e) => setModalClientName(e.target.value)}
                      placeholder="Ej: Pinturas Ramírez S.L."
                      className={inputClass}
                    />
                  </ModalField>

                  <ModalField label="NIF / NIE / CIF" required>
                    <input
                      type="text"
                      required
                      value={modalNif}
                      onChange={(e) => setModalNif(e.target.value.toUpperCase())}
                      placeholder="Ej: B12345678"
                      className={`${inputClass} font-mono uppercase`}
                    />
                  </ModalField>

                  <div className="grid grid-cols-2 gap-3">
                    <ModalField label="Teléfono Móvil" required>
                      <input
                        type="tel"
                        required
                        value={modalTelefono}
                        onChange={(e) => setModalTelefono(e.target.value)}
                        placeholder="Ej: 612345678"
                        className={inputClass}
                      />
                    </ModalField>
                    <ModalField label="Email Contacto" required>
                      <input
                        type="email"
                        required
                        value={modalEmail}
                        onChange={(e) => setModalEmail(e.target.value)}
                        placeholder="Ej: comercial@empresa.com"
                        className={inputClass}
                      />
                    </ModalField>
                  </div>

                  <ModalField label="IBAN Cuenta de Pago" required>
                    <input
                      type="text"
                      required
                      value={modalIban}
                      onChange={(e) => setModalIban(e.target.value.toUpperCase())}
                      placeholder="ES21 0000 0000 0000..."
                      className={`${inputClass} font-mono uppercase`}
                    />
                  </ModalField>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-brand-subtext bg-brand-surface p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase">
                        Segmento
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                        {modalSegment}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-550 uppercase">
                        Tarifa de Acceso
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                        {modalAccessTariff}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                    Punto de Suministro y Tarifa
                  </h3>

                  <ModalField label="Dirección Completa de Facturación" required>
                    <input
                      type="text"
                      required
                      value={modalDireccionCompleta}
                      onChange={(e) => setModalDireccionCompleta(e.target.value)}
                      placeholder="Calle de la Energía 44, 2ºB, Madrid"
                      className={inputClass}
                    />
                  </ModalField>

                  <ModalField label="Dirección Punto de Suministro" required>
                    <input
                      type="text"
                      required
                      value={modalDireccionSuministro}
                      onChange={(e) => setModalDireccionSuministro(e.target.value)}
                      placeholder="Calle Suministro Industrial s/n, Nave 3, Sevilla"
                      className={inputClass}
                    />
                  </ModalField>

                  <ModalField label="CUPS Oficial de Suministro" required>
                    <input
                      type="text"
                      required
                      value={modalCups}
                      onChange={(e) => setModalCups(e.target.value.toUpperCase())}
                      placeholder="ES0021000000000000XX"
                      className={`${inputClass} font-mono font-bold uppercase tracking-wider`}
                    />
                  </ModalField>

                  <ModalField label="Potencia Contratada" required>
                    <input
                      type="text"
                      required
                      value={modalPotencia}
                      onChange={(e) => setModalPotencia(e.target.value)}
                      placeholder="Ej: P1: 15kW, P2: 15kW"
                      className={inputClass}
                    />
                  </ModalField>

                  <div className="grid grid-cols-2 gap-3">
                    <ModalField label="Tipo de precio" required>
                      <select
                        required
                        value={modalTipoPrecio}
                        onChange={(e) =>
                          setModalTipoPrecio(e.target.value as "fijo" | "mercado")
                        }
                        className={`${inputClass} focus:outline-none`}
                      >
                        <option value="">Seleccionar…</option>
                        <option value="fijo">Precio fijo</option>
                        <option value="mercado">Precio de mercado</option>
                      </select>
                    </ModalField>
                    <ModalField label="Precio consumo (€/kWh)" required>
                      <input
                        type="text"
                        required
                        inputMode="decimal"
                        value={modalPrecioFijoConsumo}
                        onChange={(e) => setModalPrecioFijoConsumo(e.target.value)}
                        placeholder="Ej: 0,118"
                        className={`${inputClass} font-mono`}
                      />
                    </ModalField>
                  </div>

                  <ModalField label="Fecha inicio contrato" required>
                    <input
                      type="date"
                      required
                      value={modalFechaInicio}
                      onChange={(e) => setModalFechaInicio(e.target.value)}
                      className={inputClass}
                    />
                  </ModalField>

                  <ModalField label="Tipo suministro" required>
                    <select
                      required
                      value={compTipo}
                      onChange={(e) => setCompTipo(e.target.value as "luz" | "gas")}
                      className={`${inputClass} focus:outline-none`}
                    >
                      <option value="luz">Luz</option>
                      <option value="gas">Gas</option>
                    </select>
                  </ModalField>

                  <div className="grid grid-cols-2 gap-3">
                    <ModalField label="Compañía" required>
                      <select
                        required
                        value={modalCompany}
                        onChange={(e) => setModalCompany(e.target.value)}
                        className={`${inputClass} focus:outline-none`}
                      >
                        {Object.keys(companiesTariffsCatalog[modalAccessTariff] || {}).map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </select>
                    </ModalField>
                    <ModalField label="Tarifa" required>
                      <select
                        required
                        value={modalTariff}
                        onChange={(e) => setModalTariff(e.target.value)}
                        className={`${inputClass} focus:outline-none`}
                      >
                        {(
                          (companiesTariffsCatalog[modalAccessTariff] || {})[modalCompany] || []
                        ).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </ModalField>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono">
                  Adjuntos del Expediente (CIF, Facturas, Certificados)
                </label>
                <FileDropZone
                  className="rounded-2xl border-slate-200 dark:border-white/10 bg-brand-surface text-slate-400 dark:text-slate-300"
                  label="Arrastra y suelta documentos o haz clic aquí"
                  hint="PDF, DOCX, imágenes (max 25MB) · Ctrl+V · Shift+V"
                  accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onFiles={appendModalFiles}
                />
                {modalFiles.length > 0 && (
                  <div className="p-3 bg-brand-surface/60 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 block">
                      Expediente adjunto ({modalFiles.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modalFiles.map((f, i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-[#0c1222] p-2 rounded-xl flex items-center justify-between border border-slate-150 dark:border-white/5 text-xs text-slate-700 dark:text-slate-350"
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate font-medium">{f.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              ({f.size})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalFiles(modalFiles.filter((_, idx) => idx !== i))}
                            className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="px-5 py-2.5 bg-brand-surface border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-elevated transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow"
                >
                  <Lock className="w-3.5 h-3.5 text-white/90" />
                  Firmar y Emitir Contrato
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"

function ModalField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}
