import { useEffect, useId, useMemo, useState } from "react"
import { Search, Sparkles } from "lucide-react"
import type { Client } from "../../types/client"
import type { NewContractFormState } from "../../lib/contract-registration"
import {
  clientToContractFormPatch,
  parseClientPortfolioRole,
  rankPortfolioMatches,
  shouldScopeClientSearchToComercial,
  visiblePortfolioClients,
} from "../../lib/client-portfolio-search"
import { searchClientes } from "../../lib/supabase/clientes"
import { isSupabaseConfigured } from "../../lib/supabase/client"

interface ClientPortfolioSearchProps {
  clients: Client[]
  activeUserId: string
  activeRole?: string
  teamMemberIds?: string[]
  onSelectClient: (patch: Partial<NewContractFormState>) => void
  /** Oculta la etiqueta superior (p. ej. wizard de contrato). */
  showHeading?: boolean
}

export function ClientSuggestList({
  clients,
  onSelect,
  activeId,
}: {
  clients: Client[]
  onSelect: (client: Client) => void
  activeId?: string
}) {
  if (clients.length === 0) return null

  return (
    <ul
      role="listbox"
      className="absolute z-20 left-0 right-0 mt-1 border border-brand-border rounded-lg overflow-hidden divide-y divide-brand-border/60 max-h-52 overflow-y-auto bg-brand-panel shadow-xl"
    >
      {clients.map((client) => {
        const isActive = client.id === activeId
        return (
          <li key={client.id} role="option" aria-selected={isActive}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(client)}
              className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
                isActive ? "bg-cyan-50 dark:bg-cyan-950/40" : "hover:bg-brand-surface/80"
              }`}
            >
              <p className="text-xs font-semibold text-brand-text">{client.nombre}</p>
              <p className="text-[10px] font-mono text-brand-subtext">
                {client.documento || "Sin NIF"}
                {client.email ? ` · ${client.email}` : ""}
                {client.telefono ? ` · ${client.telefono}` : ""}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ClientPortfolioSearch({
  clients,
  activeUserId,
  activeRole = "comercial",
  teamMemberIds = [],
  onSelectClient,
  showHeading = true,
}: ClientPortfolioSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [remoteClients, setRemoteClients] = useState<Client[]>([])

  const role = parseClientPortfolioRole(activeRole)
  const portfolio = useMemo(
    () =>
      visiblePortfolioClients({
        clients,
        activeRole: role,
        activeUserId,
        teamMemberIds,
      }),
    [clients, role, activeUserId, teamMemberIds]
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
        comercialId: shouldScopeClientSearchToComercial(role) ? activeUserId : undefined,
        limit: 12,
      }).then((result) => {
        if (result.ok) setRemoteClients(result.data)
      })
    }, 180)

    return () => window.clearTimeout(timer)
  }, [query, activeUserId, role])

  const mergedPortfolio = useMemo(() => {
    const byId = new Map<string, Client>()
    for (const client of portfolio) byId.set(client.id, client)
    for (const client of remoteClients) {
      if (!byId.has(client.id)) byId.set(client.id, client)
    }
    return Array.from(byId.values())
  }, [portfolio, remoteClients])

  const results = useMemo(
    () => rankPortfolioMatches(mergedPortfolio, query, 12),
    [mergedPortfolio, query]
  )

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  function applyClient(client: Client) {
    onSelectClient(clientToContractFormPatch(client))
    setQuery(client.nombre)
    setFocused(false)
  }

  const showPanel = focused
  const highlighted = results[highlightIndex]

  return (
    <div className="space-y-2">
      {showHeading ? (
        <label className="flex items-center gap-1.5 text-[10px] font-mono text-brand-subtext uppercase">
          <Sparkles className="w-3 h-3 text-cyan-500" />
          Buscador de clientes
        </label>
      ) : null}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
        <input
          type="search"
          value={query}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value)
            setFocused(true)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setFocused(true)
              setHighlightIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setHighlightIndex((index) => Math.max(index - 1, 0))
            } else if (event.key === "Enter" && highlighted) {
              event.preventDefault()
              applyClient(highlighted)
            } else if (event.key === "Escape") {
              setFocused(false)
            }
          }}
          placeholder="Nombre, NIF, email, teléfono…"
          aria-label="Buscar cliente de tu cartera"
          className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text focus:ring-1 focus:ring-cyan-500 focus:outline-none"
        />
        {showPanel ? (
          <div id={listId}>
            {results.length > 0 ? (
              <ClientSuggestList
                clients={results}
                activeId={highlighted?.id}
                onSelect={applyClient}
              />
            ) : (
              <div className="absolute z-20 left-0 right-0 mt-1 border border-brand-border rounded-lg bg-brand-panel px-3 py-2 text-[10px] font-mono text-brand-subtext shadow-xl">
                {query.trim()
                  ? "Ningún cliente coincide. Completa los datos y se creará en tu cartera al guardar."
                  : mergedPortfolio.length === 0
                    ? "Aún no hay clientes en tu cartera"
                    : "Escribe un nombre, NIF, email o teléfono"}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <p className="text-[9px] font-mono text-brand-subtext">
        {mergedPortfolio.length} cliente{mergedPortfolio.length === 1 ? "" : "s"} en tu cartera
      </p>
    </div>
  )
}
