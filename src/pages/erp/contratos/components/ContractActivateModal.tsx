import { motion } from "motion/react"
import { CheckCircle, Zap } from "lucide-react"
import type { Contract } from "@/types/contract"
import type { Profile } from "@/types/profile"
import { computeActivationSplitPreview } from "@/lib/erp/contract-activation"

export interface ContractActivateModalProps {
  contract: Contract
  profiles: Profile[]
  activateConsumoKwh: number
  activatePowerKw: number
  isLoading: boolean
  onConsumoChange: (value: number) => void
  onPotenciaChange: (value: number) => void
  onClose: () => void
  onConfirm: () => void
}

export function ContractActivateModal({
  contract,
  profiles,
  activateConsumoKwh,
  activatePowerKw,
  isLoading,
  onConsumoChange,
  onPotenciaChange,
  onClose,
  onConfirm,
}: ContractActivateModalProps) {
  const preview = computeActivationSplitPreview(
    contract,
    activateConsumoKwh,
    activatePowerKw,
    profiles
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10"
      >
        <div className="flex items-center space-x-3 text-emerald-400">
          <Zap className="w-5 h-5" />
          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white">
            Aprobación, Activación e Insert RLS
          </h3>
        </div>

        <div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Se calcula la liquidación contable inmediata procediendo a la activación del
            suministro energético y aplicando la regla retributiva:
          </p>
          <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px] font-mono text-slate-500 mt-2 space-y-1">
            <span className="text-emerald-500 font-bold block uppercase text-[8px]">
              Reparticiones Reguladas:
            </span>
            <span>
              • Comercial Individual (Comisión Directa): <strong className="text-white">50%</strong>
            </span>
            <span>
              • Jefe Comercial (Override de Supervisión):{" "}
              <strong className="text-white">20%</strong>
            </span>
            <span>
              • Superadmin/Empresa (Retenido Base del ERP):{" "}
              <strong className="text-white">30%</strong>
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">CLIENTE:</span>
            <span className="text-slate-200 font-bold">{contract.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">CUPS SUMINISTRO:</span>
            <span className="text-slate-300 font-mono text-[10px]">{contract.cups}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">TIPO COMERCIAL:</span>
            <span className="text-slate-200 font-bold uppercase">{contract.tipo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">ASESOR DE REPORTE:</span>
            <span className="text-slate-200">{contract.comercialName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">
              Consumo Real (kWh/año)
            </label>
            <input
              type="number"
              value={activateConsumoKwh}
              onChange={(e) => onConsumoChange(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-white/15 rounded-lg p-2 font-mono text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">
              Potencia Suministro (kW)
            </label>
            <input
              type="number"
              step="0.1"
              value={activatePowerKw}
              onChange={(e) => onPotenciaChange(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-white/15 rounded-lg p-2 font-mono text-white text-xs"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border border-emerald-500/20 rounded-xl space-y-2 text-xs font-mono">
          <div className="flex justify-between text-white border-b border-white/5 pb-1.5 text-[10px]">
            <span>COMISIÓN BRUTA GLOBAL (100%):</span>
            <span className="font-extrabold text-emerald-400">{preview.totalCom} €</span>
          </div>
          <div className="space-y-1 text-[10px] pt-1">
            <div className="flex justify-between text-yellow-400/90 font-semibold">
              <span>↳ Comercial (50% Split):</span>
              <span>{preview.comercialShare} €</span>
            </div>
            <p className="text-[8px] text-slate-500 pl-3">
              Destinatario: {contract.comercialName}
            </p>
            <div className="flex justify-between text-cyan-400/90 font-semibold">
              <span>↳ Jefe Comercial (20% Override):</span>
              <span>{preview.jefeShare} €</span>
            </div>
            <p className="text-[8px] text-slate-500 pl-3">
              Supervisor:{" "}
              {preview.managerProfile
                ? preview.managerProfile.fullName
                : "Sin manager (Rolls up to company)"}
            </p>
            <div className="flex justify-between text-emerald-400/90 font-semibold">
              <span>↳ Empresa Plataforma (30% Retención):</span>
              <span>{preview.superadminShare} €</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 text-xs pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-slate-950"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Distribuyendo...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <span>Confirmar Activación & Reparto ERP</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
