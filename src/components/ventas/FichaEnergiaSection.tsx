import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Prospecto, UpdateProspectoPatch } from "../../lib/ventas/types"

interface FichaEnergiaSectionProps {
  prospecto: Prospecto
  onSave: (
    patch: UpdateProspectoPatch
  ) => Promise<{ ok: true } | { ok: false; message: string }>
}

export function FichaEnergiaSection({ prospecto, onSave }: FichaEnergiaSectionProps) {
  const [cups, setCups] = useState(prospecto.cups ?? "")
  const [tipoSuministro, setTipoSuministro] = useState(prospecto.tipoSuministro ?? "")
  const [consumoAnualKwh, setConsumoAnualKwh] = useState(
    prospecto.consumoAnualKwh != null ? String(prospecto.consumoAnualKwh) : ""
  )
  const [companiaActual, setCompaniaActual] = useState(prospecto.companiaActual ?? "")
  const [vencimientoPermanencia, setVencimientoPermanencia] = useState(
    prospecto.vencimientoPermanencia?.slice(0, 10) ?? ""
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCups(prospecto.cups ?? "")
    setTipoSuministro(prospecto.tipoSuministro ?? "")
    setConsumoAnualKwh(
      prospecto.consumoAnualKwh != null ? String(prospecto.consumoAnualKwh) : ""
    )
    setCompaniaActual(prospecto.companiaActual ?? "")
    setVencimientoPermanencia(prospecto.vencimientoPermanencia?.slice(0, 10) ?? "")
  }, [prospecto])

  async function handleSave() {
    setError(null)
    setSaving(true)
    const patch: UpdateProspectoPatch = {
      cups: cups.trim() || undefined,
      tipoSuministro: tipoSuministro === "luz" || tipoSuministro === "gas" ? tipoSuministro : undefined,
      consumoAnualKwh: consumoAnualKwh ? Number(consumoAnualKwh) : undefined,
      companiaActual: companiaActual.trim() || undefined,
      vencimientoPermanencia: vencimientoPermanencia || undefined,
    }
    const result = await onSave(patch)
    setSaving(false)
    if (result.ok === false) {
      setError(result.message)
      toast.error(result.message)
      return
    }
    toast.success("Energía guardada")
  }

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
      aria-label="Datos energéticos"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Datos energéticos
      </h3>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">CUPS</label>
        <input
          value={cups}
          onChange={(e) => setCups(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Tipo suministro
        </label>
        <select
          value={tipoSuministro}
          onChange={(e) => setTipoSuministro(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        >
          <option value="">—</option>
          <option value="luz">Luz</option>
          <option value="gas">Gas</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Consumo anual (kWh)
        </label>
        <input
          type="number"
          min={0}
          value={consumoAnualKwh}
          onChange={(e) => setConsumoAnualKwh(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Compañía actual
        </label>
        <input
          value={companiaActual}
          onChange={(e) => setCompaniaActual(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Vencimiento permanencia
        </label>
        <input
          type="date"
          value={vencimientoPermanencia}
          onChange={(e) => setVencimientoPermanencia(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar energía"}
      </button>
    </section>
  )
}
