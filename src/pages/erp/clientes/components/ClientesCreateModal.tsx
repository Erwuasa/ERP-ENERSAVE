import { useEffect, useMemo, useState } from "react"
import { Loader2, UserPlus, X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { ENERSAVE_ACTION, clientTypeBadgeClass } from "@/lib/enersave-ui-theme"
import type { ClienteEstado, ClienteTipo } from "@/types/client"
import {
  defaultComercialIdForClientCreate,
  emptyClientesCreateForm,
  shouldPickComercialOnClientCreate,
  validateClientesCreateForm,
  type ClientesCreateFormState,
  type ClientesCreateRole,
} from "@/pages/erp/clientes/lib/clientes-create-form"
import type { ClientesProfileOption } from "@/pages/erp/clientes/components/clientes-panel-utils"

const INPUT =
  "w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text placeholder:text-brand-subtext focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/50 transition-colors"
const LABEL = "block text-[10px] font-mono font-bold uppercase tracking-wide text-brand-subtext mb-1"

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (form: ClientesCreateFormState) => Promise<boolean>
  activeUserId: string
  activeRole: ClientesCreateRole
  profiles: ClientesProfileOption[]
}

export function ClientesCreateModal({
  open,
  onClose,
  onSubmit,
  activeUserId,
  activeRole,
  profiles,
}: Props) {
  const [form, setForm] = useState(() => emptyClientesCreateForm(activeUserId))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const comercialOptions = useMemo(
    () =>
      profiles.filter(
        (p) => p.role === "comercial" || p.role === "jefe_comercial" || p.role === "superadmin"
      ),
    [profiles]
  )

  const showComercialPicker = shouldPickComercialOnClientCreate(activeRole)

  useEffect(() => {
    if (!open) return
    const base = emptyClientesCreateForm(activeUserId)
    setForm(
      shouldPickComercialOnClientCreate(activeRole)
        ? { ...base, comercialId: "" }
        : { ...base, comercialId: activeUserId }
    )
    setError(null)
    setSaving(false)
  }, [open, activeUserId, activeRole])

  useEffect(() => {
    if (!open || !showComercialPicker) return
    const ids = comercialOptions.map((p) => p.id)
    if (ids.length === 0) return
    setForm((prev) => {
      if (prev.comercialId && ids.includes(prev.comercialId)) return prev
      return {
        ...prev,
        comercialId: defaultComercialIdForClientCreate(activeRole, activeUserId, ids),
      }
    })
  }, [open, showComercialPicker, activeRole, activeUserId, comercialOptions])

  function patch<K extends keyof ClientesCreateFormState>(key: K, value: ClientesCreateFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateClientesCreateForm(form, activeRole)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    const ok = await onSubmit(form)
    setSaving(false)
    if (ok) onClose()
  }

  if (!open) return null

  return (
    <AppFullScreenModal open onClose={onClose}>
      <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl mx-4">
        <div className="p-4 border-b border-brand-border flex justify-between items-start gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Nuevo cliente
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["particular", "empresa"] as ClienteTipo[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => patch("tipoCliente", tipo)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                    form.tipoCliente === tipo
                      ? clientTypeBadgeClass(tipo === "empresa" ? "empresa" : "particular")
                      : "border border-brand-border text-brand-subtext hover:text-brand-text hover:border-slate-300/70"
                  }`}
                >
                  {tipo === "empresa" ? "PYME" : "Particular"}
                </button>
              ))}
            </div>

            {showComercialPicker ? (
              <div>
                <label className={LABEL} htmlFor="cliente-comercial">
                  Comercial responsable
                </label>
                <select
                  id="cliente-comercial"
                  value={form.comercialId}
                  onChange={(e) => patch("comercialId", e.target.value)}
                  className={`${INPUT} py-2`}
                >
                  {comercialOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={form.tipoCliente === "empresa" ? "sm:col-span-2" : ""}>
                <label className={LABEL} htmlFor="cliente-nombre">
                  {form.tipoCliente === "empresa" ? "Razón social" : "Nombre"}
                </label>
                <input
                  id="cliente-nombre"
                  value={form.nombre}
                  onChange={(e) => patch("nombre", e.target.value)}
                  className={INPUT}
                  autoFocus
                  placeholder={form.tipoCliente === "empresa" ? "Empresa S.L." : "Nombre"}
                />
              </div>
              {form.tipoCliente === "particular" ? (
                <div>
                  <label className={LABEL} htmlFor="cliente-apellidos">
                    Apellidos
                  </label>
                  <input
                    id="cliente-apellidos"
                    value={form.apellidos}
                    onChange={(e) => patch("apellidos", e.target.value)}
                    className={INPUT}
                    placeholder="Apellidos"
                  />
                </div>
              ) : null}
              <div>
                <label className={LABEL} htmlFor="cliente-documento">
                  DNI / CIF
                </label>
                <input
                  id="cliente-documento"
                  value={form.documento}
                  onChange={(e) => patch("documento", e.target.value.toUpperCase())}
                  className={`${INPUT} font-mono uppercase`}
                  placeholder="12345678Z / B12345678"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="cliente-estado">
                  Términos / estado
                </label>
                <select
                  id="cliente-estado"
                  value={form.estado}
                  onChange={(e) => patch("estado", e.target.value as ClienteEstado)}
                  className={INPUT}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="activo">Aceptado</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="cliente-telefono">
                  Teléfono
                </label>
                <input
                  id="cliente-telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => patch("telefono", e.target.value)}
                  className={INPUT}
                  placeholder="600 000 000"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="cliente-email">
                  Email
                </label>
                <input
                  id="cliente-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                  className={INPUT}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="cliente-provincia">
                  Provincia
                </label>
                <input
                  id="cliente-provincia"
                  value={form.provincia}
                  onChange={(e) => patch("provincia", e.target.value)}
                  className={INPUT}
                  placeholder="Sevilla"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="cliente-ciudad">
                  Localidad
                </label>
                <input
                  id="cliente-ciudad"
                  value={form.ciudad}
                  onChange={(e) => patch("ciudad", e.target.value)}
                  className={INPUT}
                  placeholder="Localidad"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="cliente-cp">
                  Código postal
                </label>
                <input
                  id="cliente-cp"
                  value={form.codigoPostal}
                  onChange={(e) => patch("codigoPostal", e.target.value)}
                  className={`${INPUT} font-mono`}
                  placeholder="41001"
                  maxLength={5}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="cliente-notas">
                Notas internas
              </label>
              <textarea
                id="cliente-notas"
                value={form.notas}
                onChange={(e) => patch("notas", e.target.value)}
                rows={3}
                className={`${INPUT} resize-y min-h-[4.5rem]`}
                placeholder="Preferencias, horarios de contacto, particularidades del suministro…"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rgpdAccepted}
                onChange={(e) => patch("rgpdAccepted", e.target.checked)}
                className="rounded border-brand-border text-emerald-600 focus:ring-emerald-500/30"
              />
              <span className="text-[11px] text-brand-subtext">RGPD aceptado</span>
            </label>

            {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
          </div>

          <div className="p-4 border-t border-brand-border flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`h-9 px-4 text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-50 ${ENERSAVE_ACTION.secondary}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`h-9 px-4 text-[11px] font-bold rounded-lg inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 ${ENERSAVE_ACTION.primary}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
              Crear cliente
            </button>
          </div>
        </form>
      </div>
    </AppFullScreenModal>
  )
}
