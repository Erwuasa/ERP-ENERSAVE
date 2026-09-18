import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles } from "lucide-react"
import type { Client } from "../../types/client"
import type { NewContractFormState } from "../../lib/contract-registration"
import { splitClientNameToParts } from "../../lib/contract-registration"
import { searchClientes } from "../../lib/supabase/clientes"
import { isSupabaseConfigured } from "../../lib/supabase/client"

interface ClientPortfolioSearchProps {
  clients: Client[]
  activeUserId: string
  onSelectClient: (patch: Partial<NewContractFormState>) => void
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function ClientPortfolioSearch({
  clients,
  activeUserId,
  onSelectClient,
}: ClientPortfolioSearchProps) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const [remoteClients, setRemoteClients] = useState<Client[]>([])

  const portfolio = useMemo(
    () => clients.filter((c) => c.comercialId === activeUserId),
    [clients, activeUserId]
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setRemoteClients([])
      return
    }

    const trimmed = query.trim()
    const timer = window.setTimeout(() => {
      void searchClientes({
        query: trimmed,
        comercialId: activeUserId,
        limit: 12,
      }).then((result) => {
        if (result.ok) setRemoteClients(result.data)
      })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query, activeUserId])

  const mergedPortfolio = useMemo(() => {
    const byId = new Map<string, Client>()
    for (const client of portfolio) byId.set(client.id, client)
    for (const client of remoteClients) byId.set(client.id, client)
    return Array.from(byId.values())
  }, [portfolio, remoteClients])

  const results = useMemo(() => {
    const q = normalizeSearch(query)
    const pool = q ? mergedPortfolio : mergedPortfolio
    if (!q) return pool.slice(0, 8)

    return pool
      .filter((client) => {
        const haystack = normalizeSearch(
          [client.nombre, client.documento, client.email, client.telefono, client.ciudad]
            .filter(Boolean)
            .join(" ")
        )
        return haystack.includes(q)
      })
      .slice(0, 12)
  }, [mergedPortfolio, query])

  function applyClient(client: Client) {
    const { clientNombre, clientApellidos } = splitClientNameToParts(client.nombre)
    onSelectClient({
      clientName: client.nombre,
      clientNombre,
      clientApellidos,
      nif: client.documento ?? "",
      telefono: client.telefono ?? "",
      email: client.email ?? "",
      codigoPostal: client.codigoPostal ?? "",
      poblacion: client.ciudad ?? "",
      direccionFiscal: client.direccion ?? "",
      tipoCliente: client.tipoCliente === "empresa" ? "pyme" : "residencial",
      razonSocial: client.tipoCliente === "empresa" ? client.nombre : "",
    })
    setQuery(client.nombre)
    setFocused(false)
  }

  const showResults = focused && results.length > 0

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[10px] font-mono text-brand-subtext uppercase">
        <Sparkles className="w-3 h-3 text-cyan-500" />
        Buscador de clientes
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Nombre, NIF, email, teléfono…"
          aria-label="Buscar cliente de tu cartera"
          className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text focus:ring-1 focus:ring-cyan-500 focus:outline-none"
        />
        {showResults ? (
          <ul className="absolute z-20 left-0 right-0 mt-1 border border-brand-border rounded-lg overflow-hidden divide-y divide-brand-border/60 max-h-44 overflow-y-auto bg-brand-panel shadow-xl">
            {results.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyClient(client)}
                  className="w-full text-left px-3 py-2 hover:bg-brand-surface/80 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-brand-text">{client.nombre}</p>
                  <p className="text-[10px] font-mono text-brand-subtext">
                    {client.documento || "Sin NIF"}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-[9px] font-mono text-brand-subtext">
        {mergedPortfolio.length} cliente{mergedPortfolio.length === 1 ? "" : "s"} en tu cartera
      </p>
    </div>
  )
}
