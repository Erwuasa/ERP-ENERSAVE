import { useEffect, useState } from "react"
import {
  MOTIVOS_DESCARTE,
  SUB_ESTADOS_TRAMITACION,
  SUBTIPOS_PROSPECTO,
  validateTransition,
} from "../../lib/ventas/pipeline"
import type {
  MotivoDescarte,
  Prospecto,
  ProspectoFase,
  SubEstadoTramitacion,
  SubtipoProspecto,
  UpdateProspectoFaseInput,
} from "../../lib/ventas/types"

interface FaseChangeFieldsProps {
  toFase: ProspectoFase
  prospecto: Prospecto
  onChange: (input: UpdateProspectoFaseInput | null) => void
}

export function FaseChangeFields({ toFase, prospecto, onChange }: FaseChangeFieldsProps) {
  const [subtipoProspecto, setSubtipoProspecto] = useState<SubtipoProspecto | "">(
    prospecto.subtipoProspecto ?? ""
  )
  const [subEstado, setSubEstado] = useState<SubEstadoTramitacion | "">(
    prospecto.subEstado ?? ""
  )
  const [motivoConDudas, setMotivoConDudas] = useState("")
  const [motivoDescarte, setMotivoDescarte] = useState<MotivoDescarte | "">("")
  const [motivoRecontacto, setMotivoRecontacto] = useState("")
  const [fechaRecontactar, setFechaRecontactar] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubtipoProspecto(prospecto.subtipoProspecto ?? "")
    setSubEstado(prospecto.subEstado ?? "")
    setMotivoConDudas("")
    setMotivoDescarte("")
    setMotivoRecontacto("")
    setFechaRecontactar("")
    setError(null)
  }, [toFase, prospecto.id])

  useEffect(() => {
    const input: UpdateProspectoFaseInput = { fase: toFase }

    switch (toFase) {
      case "prospecto_nuevo":
        if (!subtipoProspecto) {
          onChange(null)
          return
        }
        input.subtipoProspecto = subtipoProspecto
        break
      case "tramitacion":
        if (!subEstado) {
          onChange(null)
          return
        }
        input.subEstado = subEstado
        break
      case "con_dudas":
        if (!motivoConDudas.trim()) {
          onChange(null)
          return
        }
        input.motivoConDudas = motivoConDudas.trim()
        break
      case "descartado":
        if (!motivoDescarte) {
          onChange(null)
          return
        }
        input.motivoDescarte = motivoDescarte
        break
      case "recontactar":
        if (!motivoRecontacto.trim() || !fechaRecontactar) {
          onChange(null)
          return
        }
        input.motivoRecontacto = motivoRecontacto.trim()
        input.fechaRecontactar = fechaRecontactar
        break
    }

    const validation = validateTransition(prospecto.fase, toFase, input)
    if (validation.ok === false) {
      setError(validation.message)
      onChange(null)
      return
    }

    setError(null)
    onChange(input)
  }, [
    toFase,
    prospecto.fase,
    subtipoProspecto,
    subEstado,
    motivoConDudas,
    motivoDescarte,
    motivoRecontacto,
    fechaRecontactar,
    onChange,
    prospecto.id,
  ])

  return (
    <div className="space-y-3">
      {toFase === "prospecto_nuevo" && (
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-brand-subtext">
            Subtipo
          </label>
          <select
            value={subtipoProspecto}
            onChange={(e) => setSubtipoProspecto(e.target.value as SubtipoProspecto)}
            className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value="">Seleccionar…</option>
            {SUBTIPOS_PROSPECTO.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {toFase === "tramitacion" && (
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-brand-subtext">
            Sub-estado tramitación
          </label>
          <select
            value={subEstado}
            onChange={(e) => setSubEstado(e.target.value as SubEstadoTramitacion)}
            className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value="">Seleccionar…</option>
            {SUB_ESTADOS_TRAMITACION.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {toFase === "con_dudas" && (
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-brand-subtext">
            Motivo de dudas
          </label>
          <textarea
            value={motivoConDudas}
            onChange={(e) => setMotivoConDudas(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none"
          />
        </div>
      )}

      {toFase === "descartado" && (
        <div className="space-y-1">
          <label className="block text-[10px] font-mono uppercase text-brand-subtext">
            Motivo de descarte
          </label>
          <select
            value={motivoDescarte}
            onChange={(e) => setMotivoDescarte(e.target.value as MotivoDescarte)}
            className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value="">Seleccionar…</option>
            {MOTIVOS_DESCARTE.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {toFase === "recontactar" && (
        <>
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext">
              Motivo de recontacto
            </label>
            <textarea
              value={motivoRecontacto}
              onChange={(e) => setMotivoRecontacto(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext">
              Fecha de recontacto
            </label>
            <input
              type="date"
              value={fechaRecontactar}
              onChange={(e) => setFechaRecontactar(e.target.value)}
              className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
            />
          </div>
        </>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
