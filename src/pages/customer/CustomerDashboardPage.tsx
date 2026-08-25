import { useEffect, useState } from "react"
import { FileText, LogOut, Receipt } from "lucide-react"
import { EnersaveLogo } from "@/components/common/EnersaveLogo"
import { colors, fonts, radius } from "@/constants/styles"
import { useAuth } from "@/hooks/useAuth"
import { listOwnCustomerLeads, type CustomerLead } from "@/lib/supabase/customer-leads"

function formatEur(value: number | null): string {
  if (value == null) return "—"
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function QuoteCard({ lead, index }: { lead: CustomerLead; index: number }) {
  const title = lead.providerName
    ? `${lead.providerName} · ${lead.tariffName ?? "Tarifa"}`
    : lead.tariffName ?? `Solicitud ${index + 1}`

  return (
    <article className={`${colors.panel} border ${colors.border} ${radius["2xl"]} p-6 space-y-4`}>
      <div>
        <p className={`text-[10px] font-mono uppercase tracking-wider ${colors.subtext}`}>
          Cotización {index + 1}
        </p>
        <h2 className={`text-sm font-bold ${colors.text} mt-1`}>{title}</h2>
        <p className={`text-xs ${colors.subtext} mt-1`}>
          Ahorro est. {formatEur(lead.estimatedSavingMonthlyEur)}
          {lead.estimatedSavingPercentage != null ? ` (${lead.estimatedSavingPercentage}%)` : ""}
        </p>
        {lead.cups && <p className={`text-xs ${fonts.mono} ${colors.subtext} mt-1`}>CUPS {lead.cups}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-cyan-500" />
          <h3 className={`text-xs font-bold ${colors.text}`}>Facturas</h3>
        </div>
        {lead.facturasUrls.length === 0 ? (
          <p className={`text-xs ${colors.subtext}`}>Sin facturas en esta solicitud.</p>
        ) : (
          <ul className="space-y-1.5">
            {lead.facturasUrls.map((url, facturaIndex) => (
              <li key={`${lead.id}-${facturaIndex}`}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 underline"
                >
                  Ver factura {lead.facturasUrls.length > 1 ? facturaIndex + 1 : ""}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

export function CustomerDashboardPage() {
  const { activeUser, logout } = useAuth()
  const [leads, setLeads] = useState<CustomerLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await listOwnCustomerLeads()
      if (cancelled) return
      if (result.ok === false) {
        setError(result.message)
        setLeads([])
      } else {
        setError(null)
        setLeads(result.data)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={`min-h-screen ${colors.bg} ${fonts.sans}`}>
      <header
        className={`border-b ${colors.border} ${colors.panel} px-6 py-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <EnersaveLogo className="h-10 w-10" />
          <div>
            <p className={`text-sm font-bold ${colors.text}`}>Área cliente</p>
            <p className={`text-[11px] ${colors.subtext}`}>{activeUser.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold ${colors.subtext} hover:${colors.text} ${radius.xl}`}
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${colors.text}`}>
            Hola, {activeUser.fullName || "cliente"}
          </h1>
          <p className={`mt-1 text-sm ${colors.subtext}`}>
            Cada solicitud de la web es una cotización, con sus facturas.
          </p>
        </div>

        {loading && <p className={`text-sm ${colors.subtext}`}>Cargando tu historial…</p>}
        {error && <p className="text-sm text-rose-500">{error}</p>}

        {!loading && !error && leads.length === 0 && (
          <div className={`${colors.panel} border ${colors.border} ${radius["2xl"]} p-6 flex items-start gap-3`}>
            <FileText className="w-4 h-4 text-amber-500 mt-0.5" />
            <p className={`text-xs ${colors.subtext} leading-relaxed`}>
              Aún no hay solicitudes de la web con este correo.
            </p>
          </div>
        )}

        {!loading && !error && leads.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {leads.map((lead, index) => (
              <QuoteCard key={lead.id} lead={lead} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
