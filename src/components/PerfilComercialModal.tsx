import { useEffect, useState } from "react"
import { Loader2, UserCircle2, X } from "lucide-react"
import { toast } from "sonner"
import {
  isComercialFiscalProfileComplete,
  type ComercialFiscalForm,
} from "../lib/comercial-fiscal-profile"
import { updateErpComercial } from "../lib/supabase/erp-comerciales"

interface PerfilComercialModalProps {
  open: boolean
  onClose: () => void
  comercialId: string
  fullName: string
  email: string
  initialForm: ComercialFiscalForm
  onSaved: (form: ComercialFiscalForm) => void
}

function Field({
  label,
  value,
  onChange,
  readOnly = false,
  placeholder,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">{label}</span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border border-brand-border text-sm text-brand-text ${
          readOnly ? "bg-brand-panel text-brand-subtext" : "bg-brand-surface"
        }`}
      />
    </label>
  )
}

export function PerfilComercialModal({
  open,
  onClose,
  comercialId,
  fullName,
  email,
  initialForm,
  onSaved,
}: PerfilComercialModalProps) {
  const [form, setForm] = useState<ComercialFiscalForm>(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(initialForm)
  }, [open, initialForm])

  if (!open) return null

  const profileComplete = isComercialFiscalProfileComplete(form)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await updateErpComercial(comercialId, {
        dni: form.dni.trim() || null,
        direccion: form.direccion.trim() || null,
        ciudad: form.ciudad.trim() || null,
        codigo_postal: form.codigoPostal.trim() || null,
        telefono: form.telefono.trim() || null,
        iban: form.iban.trim() || null,
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      onSaved(form)
      toast.success("Perfil fiscal guardado correctamente.")
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar el perfil fiscal.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-panel shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-comercial-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 id="perfil-comercial-title" className="text-sm font-bold text-brand-text">
                Perfil fiscal
              </h2>
              <p className="text-[10px] font-mono text-brand-subtext">{fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {!profileComplete ? (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">
              Completa tu perfil fiscal para poder generar autofacturas automáticamente.
            </p>
          ) : null}

          <Field label="Email" value={email} readOnly />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="DNI / NIF" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
            <Field
              label="Teléfono"
              value={form.telefono}
              onChange={(v) => setForm({ ...form, telefono: v })}
            />
          </div>

          <Field
            label="Dirección fiscal"
            value={form.direccion}
            onChange={(v) => setForm({ ...form, direccion: v })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Ciudad"
              value={form.ciudad}
              onChange={(v) => setForm({ ...form, ciudad: v })}
            />
            <Field
              label="Código postal"
              value={form.codigoPostal}
              onChange={(v) => setForm({ ...form, codigoPostal: v })}
            />
          </div>

          <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-10 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
