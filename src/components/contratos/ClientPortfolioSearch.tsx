import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import {
  activeRetroWarningMessage,
  buildClientContractAutofillPatch,
  findActiveRetroForClientContracts,
} from "../../lib/contract-cups-liquidacion"
import type { NewContractFormState } from "../../lib/contract-registration"
import { isSupabaseConfigured } from "../../lib/supabase/client"
import { searchClientes } from "../../lib/supabase/clientes"
import type { Client } from "../../types/client"
import type { Contract } from "../../types/contract"

const SEARCH_DEBOUNCE_MS = 150
const RESULT_LIMIT = 10
const EMPTY_QUERY_PREVIEW = 6

interface ClientPortfolioSearchProps {
  contracts: Contract[]
  activeUserId: string
  /** Respaldo local cuando Supabase no está configurado. */
  fallbackClients?: Client[]
  editingContractId?: string | null
  onSelectClient: (patch: Partial<NewContractFormState>) => void
}

function clientMatchesQuery(client: Client, query: string): boolean {
  const q = query.toLowerCase()
  return (
    client.nombre.toLowerCase().includes(q) ||
    (client.documento?.toLowerCase().includes(q) ?? false) ||
    (client.email?.toLowerCase().includes(q) ?? false)
  )
}

function filterPortfolioClients(
  clients: Client[],
  comercialId: string,
  query: string,
  limit = RESULT_LIMIT
): Client[] {
  const portfolio = clients.filter((c) => c.comercialId === comercialId)
  const trimmed = query.trim()
  if (!trimmed) return portfolio.slice(0, EMPTY_QUERY_PREVIEW)
  const q = trimmed.toLowerCase()
  return portfolio.filter((c) => clientMatchesQuery(c, q)).slice(0, limit)
}

function highlightMatch(text: string, query: string): ReactNode {
  const trimmed = query.trim()
  if (!trimmed || !text) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 font-bold rounded-sm px-0.5 not-italic">
        {text.slice(index, index + trimmed.length)}
      </mark>
      {text.slice(index + trimmed.length)}
    </>
  )
}

export function ClientPortfolioSearch({
  contracts,
  activeUserId,
  fallbackClients = [],
  editingContractId,
  onSelectClient,
}: ClientPortfolioSearchProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [retroNotice, setRetroNotice] = useState<string | null>(null)
  const fallbackClientsRef = useRef(fallbackClients)
  fallbackClientsRef.current = fallbackClients

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  const localResults = useMemo(
    () => filterPortfolioClients(fallbackClients, activeUserId, debouncedQuery),
    [fallbackClients, activeUserId, debouncedQuery]
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setResults(localResults)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void searchClientes({
      query: debouncedQuery,
      comercialId: activeUserId,
      limit: debouncedQuery.trim() ? RESULT_LIMIT : EMPTY_QUERY_PREVIEW,
    }).then((result) => {
      if (cancelled) return
      setResults(
        result.ok
          ? result.data
          : filterPortfolioClients(
              fallbackClientsRef.current,
              activeUserId,
              debouncedQuery
            )
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeUserId])

  function applyClient(client: Client) {
    onSelectClient(buildClientContractAutofillPatch(client, contracts))
    setQuery(client.nombre)

    const activeRetro = findActiveRetroForClientContracts(
      {
        clientId: client.id,
        nif: client.documento,
        clientName: client.nombre,
      },
      contracts,
      editingContractId ?? undefined
    )

    if (activeRetro) {
      const message = activeRetroWarningMessage(activeRetro)
      setRetroNotice(message)
      toast.warning(message, { duration: 8000 })
    } else {
      setRetroNotice(null)
    }
  }

  const hasQuery = query.trim().length > 0
  const showDropdown = hasQuery

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
          onChange={(e) => {
            setQuery(e.target.value)
            if (!e.target.value.trim()) setRetroNotice(null)
          }}
          placeholder="Buscar por nombre, NIF o email…"
          className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          autoComplete="off"
        />
        {loading && isSupabaseConfigured() ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext animate-spin" />
        ) : null}
      </div>

      {retroNotice ? (
        <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-[11px] leading-relaxed text-violet-900 dark:text-violet-100">
          {retroNotice}
        </div>
      ) : null}

      {showDropdown ? (
        <ul className="border border-brand-border rounded-lg overflow-hidden divide-y divide-brand-border/60 max-h-52 overflow-y-auto">
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-[10px] text-brand-subtext flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              Buscando en tu cartera…
            </li>
          ) : null}
          {!loading && results.length === 0 ? (
            <li className="px-3 py-2 text-[10px] text-brand-subtext">
              No hay clientes en tu cartera con ese criterio.
            </li>
          ) : null}
          {results.map((client) => {
            const documentoLabel = client.documento || "Sin NIF"
            const q = debouncedQuery.trim().toLowerCase()
            const showEmail = Boolean(
              client.email && q && client.email.toLowerCase().includes(q)
            )

            return (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => applyClient(client)}
                  className="w-full text-left px-3 py-2 hover:bg-brand-surface/80 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-brand-text">
                    {highlightMatch(client.nombre, debouncedQuery)}
                  </p>
                  <p className="text-[10px] font-mono text-brand-subtext">
                    {highlightMatch(documentoLabel, debouncedQuery)}
                    {" · "}
                    {client.estado}
                    {client.estado === "inactivo" ? " · revisar cartera" : ""}
                    {showEmail ? (
                      <>
                        {" · "}
                        {highlightMatch(client.email ?? "", debouncedQuery)}
                      </>
                    ) : null}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
