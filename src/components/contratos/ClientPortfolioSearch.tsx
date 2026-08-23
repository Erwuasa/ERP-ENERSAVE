import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { Client } from "../../types/client"
import type { Contract } from "../../types/contract"
import type { NewContractFormState } from "../../lib/contract-registration"
import { buildClientContractAutofillPatch } from "../../lib/contract-cups-liquidacion"

interface ClientPortfolioSearchProps {
  clients: Client[]
  contracts: Contract[]
  activeUserId: string
  onSelectClient: (patch: Partial<NewContractFormState>) => void
}

export function ClientPortfolioSearch({
  clients,
  contracts,
  activeUserId,
  onSelectClient,
}: ClientPortfolioSearchProps) {
  const [query, setQuery] = useState("")

  const portfolio = useMemo(
    () => clients.filter((c) => c.comercialId === activeUserId),
    [clients, activeUserId]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return portfolio.slice(0, 6)
    return portfolio
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.documento?.toLowerCase().includes(q) ?? false) ||
          (c.email?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8)
  }, [portfolio, query])

  function applyClient(client: Client) {
    onSelectClient(buildClientContractAutofillPatch(client, contracts))
    setQuery(client.nombre)
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-mono text-brand-subtext uppercase">
        Clientes de tu cartera
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, NIF o email…"
          className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text focus:ring-1 focus:ring-cyan-500 focus:outline-none"
        />
      </div>
      {results.length > 0 && query.trim() && (
        <ul className="border border-brand-border rounded-lg overflow-hidden divide-y divide-brand-border/60 max-h-40 overflow-y-auto">
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => applyClient(client)}
                className="w-full text-left px-3 py-2 hover:bg-brand-surface/80 transition-colors cursor-pointer"
              >
                <p className="text-xs font-semibold text-brand-text">{client.nombre}</p>
                <p className="text-[10px] font-mono text-brand-subtext">
                  {client.documento || "Sin NIF"} · {client.estado}
                  {client.estado === "inactivo" ? " · revisar cartera" : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
