import { motion } from "motion/react"
import { AlertTriangle, Trash2 } from "lucide-react"
import type { FormEvent } from "react"
import type { Contract } from "@/types/contract"
import { computeClawback } from "@/lib/erp/contract-clawback"
import { formatCurrency } from "@/lib/erp/format-currency"

export interface ContractBajaModalProps {
  contract: Contract
  bajaDate: string
  isLoading: boolean
  onBajaDateChange: (value: string) => void
  onClose: () => void
  onConfirm: (e: FormEvent) => void
}

export function ContractBajaModal({
  contract,
  bajaDate,
  isLoading,
  onBajaDateChange,
  onClose,
  onConfirm,
}: ContractBajaModalProps) {
  const clawback = computeClawback(contract, bajaDate)

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
        className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10 text-slate-300"
      >
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />

        <div className="flex items-center space-x-3 text-rose-400">
          <Trash2 className="w-5 h-5 text-rose-500" />
          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white">
            Registro de Baja e Inicio de Retrocomisión
          </h3>
        </div>

        <div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Al cancelar el suministro eléctrico o de gas antes del periodo de cobertura, se
            genera una liquidación negativa proporcional contra la cuenta del comercial implicado:
          </p>
        </div>

        <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">CLIENTE AFECTADO:</span>
            <span className="text-slate-200 font-bold">{contract.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">CUPS:</span>
            <span className="text-slate-300 font-mono text-[10px]">{contract.cups}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">COMPAÑÍA / TIPO:</span>
            <span className="text-slate-200 font-bold uppercase">
              {contract.compania} ({contract.tipo})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">
              COMISIÓN ORIGINAL LIQUIDADA:
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              {formatCurrency(contract.montoExterno)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-mono text-[10px]">FECHA DE ACTIVACIÓN:</span>
            <span className="text-slate-300 font-mono">{contract.createdAt}</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="block text-[9px] font-mono text-slate-400 tracking-widest uppercase font-bold">
            Fecha Oficial de Baja de Suministro
          </label>
          <input
            type="date"
            required
            value={bajaDate}
            onChange={(e) => onBajaDateChange(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 font-mono text-white text-xs text-center border-white/10"
          />
        </div>

        {clawback.isInvalidDate ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] rounded-lg font-mono">
            ⚠️ Error: La fecha de baja no puede ser anterior a la de activación.
          </div>
        ) : clawback.isSecure ? (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono">
            <div className="text-emerald-400 font-bold text-center py-1">
              ✓ SEGURO: El contrato ha consumido todo el periodo de cobertura (
              {clawback.limitMonths} meses). No se aplicará retrocomisión negativa.
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono space-y-2">
            <div className="flex justify-between text-rose-400 border-b border-white/5 pb-1">
              <span>PENALIZACIÓN CORRESPONDIENTE:</span>
              <span className="font-extrabold">
                {(clawback.clawbackPercent * 100).toFixed(0)} %
              </span>
            </div>
            <div className="flex justify-between text-white font-bold text-[11px] pt-2">
              <span>SALDO NEGATIVO RECOBRABLE:</span>
              <span className="text-rose-405 font-black text-red-400">
                -{formatCurrency(clawback.clawbackAmount)}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1 leading-snug">
              Se deducirá {formatCurrency(clawback.clawbackAmount)} de las liquidaciones
              pendientes para {contract.comercialName}. El contrato pasará a estado «Dado de
              Baja».
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 text-xs pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-xl cursor-safe"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black rounded-xl hover:opacity-95 transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                <span>Procesando Clawback...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Confirmar Clawback Negativo</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
