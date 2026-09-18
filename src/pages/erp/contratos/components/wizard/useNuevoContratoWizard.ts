import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { listAtCatalogEntries } from "@/lib/supabase/at-catalog"
import { listMarcoRetributivo, marcoRowToCatalogEntry } from "@/lib/supabase/marco-retributivo"
import { listTariffCatalogPage } from "@/lib/supabase/tariffs"
import { mergeCompanyNames, normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import { estimateMarcoCommissionEur } from "@/lib/marco-commission"
import {
  getDocumentosObligatoriosForMarco,
  validateRequiredDocumentos,
} from "@/lib/contrato-documentos"
import {
  filterMarcoTariffs,
  getWizardCompanies,
  getWizardCompanySupplyTypes,
  isMarcoEntryForSegment,
  type ContractWizardSegment,
} from "@/lib/contract-tariff-filter"
import type { NewContractFormState, WizardStep } from "@/lib/contract-registration"
import { WIZARD_TABS } from "@/pages/erp/contratos/components/wizard/wizard-ui"
import {
  buildClientNameFromForm,
  inferTipoPrecioFromTarifa,
  newContractFormToRegistrationInput,
  validateContractRegistration,
} from "@/lib/contract-registration"
import type { ContractPeajeSegment } from "@/lib/contract-peaje-segment"
import {
  getTariffPeajeType,
  inferPeajeTypeFromSegment,
  peajeSegmentToTariffPeajeType,
  spreadPotenciaFromP1,
} from "@/lib/contract-potencia"
import {
  computeServiciosExtrasCommissionEur,
  listServiciosExtrasForWizard,
} from "@/lib/marco-servicios-extras"
import {
  dedupeMarcoTariffsForSelect,
  findMarcoTramoCandidates,
  resolveMarcoTramoForConsumo,
} from "@/lib/marco-consumo-tramo"
import { lookupSpainPostalCode } from "@/lib/spain-postal-code"
import type { NuevoContratoWizardProps } from "@/pages/erp/contratos/components/wizard/wizard-types"
import { tipoClienteChipLabel } from "@/pages/erp/contratos/components/wizard/wizard-ui"

export function useNuevoContratoWizard({
  open,
  onClose,
  form,
  onChange,
  onSubmit,
  commissionPercentage,
  formatCurrency,
  profiles,
  activeUserId,
  activeUserName,
  activeUserRole,
  contracts,
}: NuevoContratoWizardProps) {
  const isCompanyStep = form.wizardStep === 1
  const activeTab = isCompanyStep ? null : form.wizardStep
  const segment = form.wizardSegment

  const [tariffSearch, setTariffSearch] = useState("")
  const [empresaOpen, setEmpresaOpen] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [cpLookupLoading, setCpLookupLoading] = useState(false)
  const [incompleteConfirmOpen, setIncompleteConfirmOpen] = useState(false)
  const [incompleteMissing, setIncompleteMissing] = useState<string[]>([])
  const [marcoCatalog, setMarcoCatalog] = useState<MarcoRetributivoEntry[]>([])
  const [serviciosExtrasExpanded, setServiciosExtrasExpanded] = useState(false)
  const [atCompanies, setAtCompanies] = useState<string[]>([])
  const [tariffCompanies, setTariffCompanies] = useState<string[]>([])
  const cpLookupRequestId = useRef(0)

  useEffect(() => {
    if (!open) return
    void listMarcoRetributivo().then((result) => {
      if (result.ok && result.data.length > 0) {
        setMarcoCatalog(result.data.map(marcoRowToCatalogEntry))
      }
    })
    void listAtCatalogEntries("billing-companies").then((result) => {
      if (result.ok) setAtCompanies(result.data.map((row) => row.label).filter(Boolean))
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    void listTariffCatalogPage({
      suministro: form.tipo,
      compania: "Todas",
      tipoCliente: segment === "pyme" ? "empresa" : "particular",
      peaje: "todos",
      webVisibility: "todas",
      search: "",
      limit: 1,
      offset: 0,
    }).then((result) => {
      if (result.ok) setTariffCompanies(Object.keys(result.data.providerCounts))
    })
  }, [open, form.tipo, segment])

  function goToTab(tab: Exclude<WizardStep, 1>) {
    onChange({ wizardStep: tab })
  }

  const isLastWizardStep = activeTab === "documentos"

  function goNextStep() {
    if (!activeTab || isLastWizardStep) return
    const order = WIZARD_TABS.map((tab) => tab.id)
    const index = order.indexOf(activeTab)
    if (index >= 0 && index < order.length - 1) {
      goToTab(order[index + 1]!)
    }
  }

  function setPeajeSegment(next: ContractPeajeSegment) {
    const peajeChanged = form.peajeSegment !== next
    onChange({
      peajeSegment: next,
      ...(peajeChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "", selectedServiciosExtras: [] } : {}),
    })
  }

  function setSegment(next: ContractWizardSegment) {
    const segmentChanged = form.wizardSegment !== next
    onChange({
      wizardSegment: next,
      ...(segmentChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" } : {}),
    })
  }

  function setTipo(next: "luz" | "gas") {
    const tipoChanged = form.tipo !== next
    onChange({
      tipo: next,
      ...(tipoChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" } : {}),
    })
  }

  const featuredCompanies = useMemo(
    () =>
      mergeCompanyNames([
        getWizardCompanies(segment, marcoCatalog, form.tipo),
        tariffCompanies,
      ]),
    [segment, marcoCatalog, form.tipo, tariffCompanies]
  )

  // Companies known to marco_retributivo, mapped to which segment(s) they
  // actually serve (independent of the currently active tab). Used below to
  // stop a pyme-only (or residencial-only) company from leaking into the
  // "resto" AT-catalog list when the *other* tab is active — the AT catalog
  // itself carries no segmento info, so we fall back to whatever
  // marco_retributivo already knows about that company.
  const marcoCompanySegments = useMemo(() => {
    const map = new Map<string, Set<ContractWizardSegment>>()
    for (const entry of marcoCatalog) {
      const key = normalizeCompaniaKey(entry.compania)
      const segs = map.get(key) ?? new Set<ContractWizardSegment>()
      if (isMarcoEntryForSegment(entry, "residencial")) segs.add("residencial")
      if (isMarcoEntryForSegment(entry, "pyme")) segs.add("pyme")
      map.set(key, segs)
    }
    return map
  }, [marcoCatalog])

  const atRestCompanies = useMemo(() => {
    const featuredKeys = new Set(featuredCompanies.map(normalizeCompaniaKey))
    return atCompanies.filter((name) => {
      const key = normalizeCompaniaKey(name)
      if (featuredKeys.has(key)) return false
      const knownSegments = marcoCompanySegments.get(key)
      if (knownSegments && !knownSegments.has(segment)) return false
      return true
    })
  }, [atCompanies, featuredCompanies, marcoCompanySegments, segment])

  const companies = useMemo(
    () => mergeCompanyNames([featuredCompanies, atRestCompanies]),
    [featuredCompanies, atRestCompanies]
  )

  const companySupplyTypes = useMemo(() => {
    const map: Record<string, Array<"luz" | "gas">> = {}
    for (const name of featuredCompanies) {
      const tipos = getWizardCompanySupplyTypes(name, segment, marcoCatalog)
      map[name] = tipos.length > 0 ? tipos : [form.tipo]
    }
    return map
  }, [featuredCompanies, segment, marcoCatalog, form.tipo])

  const filteredTariffCandidates = useMemo(
    () =>
      filterMarcoTariffs({
        compania: form.compania,
        segment,
        tipo: form.tipo,
        tipoCliente: form.tipoCliente,
        peajeSegment: form.peajeSegment,
        search: tariffSearch,
        catalog: marcoCatalog,
      }),
    [form.compania, form.tipo, form.tipoCliente, form.peajeSegment, segment, tariffSearch, marcoCatalog]
  )

  const filteredTariffs = useMemo(
    () => dedupeMarcoTariffsForSelect(filteredTariffCandidates),
    [filteredTariffCandidates]
  )

  const marcoTramoCandidates = useMemo(() => {
    if (!form.tarifa.trim()) return []
    return findMarcoTramoCandidates(marcoCatalog, {
      compania: form.compania,
      tarifa: form.tarifa,
      tipo: form.tipo,
    })
  }, [marcoCatalog, form.compania, form.tarifa, form.tipo])

  const consumoAnualKwh = form.consumoAnual === "" ? null : Number(form.consumoAnual)

  const marcoTramoResolution = useMemo(
    () => resolveMarcoTramoForConsumo(marcoTramoCandidates, consumoAnualKwh),
    [marcoTramoCandidates, consumoAnualKwh]
  )

  const serviciosExtrasOptions = useMemo(
    () =>
      listServiciosExtrasForWizard({
        catalog: marcoCatalog,
        compania: form.compania,
        segment,
        peajeSegment: form.peajeSegment,
        preferredEntryId: form.marcoEntryId || undefined,
      }),
    [marcoCatalog, form.compania, form.peajeSegment, form.marcoEntryId, segment]
  )

  const selectedMarcoEntry = useMemo(() => {
    if (marcoTramoResolution.entry) return marcoTramoResolution.entry
    if (form.marcoEntryId) {
      return marcoCatalog.find((e) => e.id === form.marcoEntryId)
    }
    return marcoCatalog.find(
      (e) => e.compania === form.compania && e.tarifa === form.tarifa && e.tipo === form.tipo
    )
  }, [marcoTramoResolution.entry, form.marcoEntryId, form.compania, form.tarifa, form.tipo, marcoCatalog])

  useEffect(() => {
    if (!open) return
    const resolvedId = marcoTramoResolution.entry?.id
    if (!resolvedId || form.marcoEntryId === resolvedId) return
    onChange({ marcoEntryId: resolvedId })
  }, [open, marcoTramoResolution.entry?.id, form.marcoEntryId, onChange])

  const documentosObligatorios = useMemo(
    () => getDocumentosObligatoriosForMarco(selectedMarcoEntry),
    [selectedMarcoEntry]
  )

  const commissionEstimate = useMemo(() => {
    const consumo = consumoAnualKwh ?? 0
    const rate = commissionPercentage / 100
    const extrasAmount = computeServiciosExtrasCommissionEur(
      serviciosExtrasOptions,
      form.selectedServiciosExtras,
      commissionPercentage
    )

    let baseAmount = 0
    let amountLabel = ""
    let detail = ""

    if (selectedMarcoEntry) {
      if (marcoTramoResolution.precision === "exacto" && consumo > 0) {
        const baseEstimate = estimateMarcoCommissionEur(
          selectedMarcoEntry,
          commissionPercentage,
          consumo,
          formatCurrency
        )
        baseAmount = baseEstimate.amountEur
        detail = baseEstimate.detail
        amountLabel = formatCurrency(baseAmount)
      } else if (
        marcoTramoResolution.precision === "estimado" &&
        marcoTramoResolution.comisionMin != null &&
        marcoTramoResolution.comisionMax != null
      ) {
        const minAmount = Math.round(marcoTramoResolution.comisionMin * rate * 100) / 100
        const maxAmount = Math.round(marcoTramoResolution.comisionMax * rate * 100) / 100
        baseAmount = maxAmount
        amountLabel =
          minAmount === maxAmount
            ? formatCurrency(minAmount)
            : `${formatCurrency(minAmount)} – ${formatCurrency(maxAmount)}`
        detail = marcoTramoResolution.condicionLabel
      } else if (selectedMarcoEntry.comisionTipo === "fija") {
        baseAmount = Math.round(selectedMarcoEntry.comisionBase * rate * 100) / 100
        amountLabel = formatCurrency(baseAmount)
        detail = marcoTramoResolution.condicionLabel
      }
    }

    const amountEur = Math.round((baseAmount + extrasAmount) * 100) / 100
    if (amountEur <= 0 && !amountLabel) return null

    return {
      amountEur,
      amountLabel: amountLabel || formatCurrency(amountEur),
      precision: marcoTramoResolution.precision,
      condicionLabel: marcoTramoResolution.condicionLabel,
      detail,
      extrasAmount,
      selectedExtrasCount: form.selectedServiciosExtras.length,
    }
  }, [
    selectedMarcoEntry,
    commissionPercentage,
    consumoAnualKwh,
    form.selectedServiciosExtras,
    formatCurrency,
    serviciosExtrasOptions,
    marcoTramoResolution,
  ])

  const peajeType = getTariffPeajeType(selectedMarcoEntry?.peaje)
  const effectivePeajeType =
    peajeSegmentToTariffPeajeType(form.peajeSegment) ??
    peajeType ??
    inferPeajeTypeFromSegment(form.wizardSegment)

  const duplicateCups = useMemo(() => {
    const cups = form.cups.trim().toUpperCase()
    if (!cups || cups === "PENDIENTE") return null
    return contracts.find((c) => c.cups.toUpperCase() === cups) ?? null
  }, [form.cups, contracts])

  const tarifaChipLabel = useMemo(() => {
    const peaje = selectedMarcoEntry?.peaje ?? (effectivePeajeType === "2.0" ? "2.0TD" : "3.0TD")
    return `${peaje} · ${tipoClienteChipLabel(form.tipoCliente)} · ${form.compania || "—"}`
  }, [selectedMarcoEntry, effectivePeajeType, form.tipoCliente, form.compania])

  useEffect(() => {
    if (!open) return
    const user = profiles.find((p) => p.id === activeUserId)
    if (!user) return
    const manager = user.managerId ? profiles.find((p) => p.id === user.managerId) : undefined
    onChange({
      nombreComercial: user.fullName,
      jefeEquipo: manager?.fullName ?? "",
    })
  }, [open, activeUserId, profiles])

  useEffect(() => {
    const cp = form.codigoPostal.replace(/\s/g, "").trim()
    if (!/^\d{5}$/.test(cp)) return

    const requestId = ++cpLookupRequestId.current
    setCpLookupLoading(true)

    lookupSpainPostalCode(cp)
      .then((result) => {
        if (requestId !== cpLookupRequestId.current || !result) return
        onChange({
          poblacion: result.poblacion || form.poblacion,
          provincia: result.provincia || form.provincia,
        })
      })
      .finally(() => {
        if (requestId === cpLookupRequestId.current) setCpLookupLoading(false)
      })
  }, [form.codigoPostal])

  function handleCodigoPostalChange(value: string) {
    onChange({ codigoPostal: value.replace(/\D/g, "").slice(0, 5) })
  }

  function handlePotenciaP1Change(value: string) {
    onChange(spreadPotenciaFromP1(value, effectivePeajeType))
  }

  function handleNombreChange(nombre: string) {
    onChange({
      clientNombre: nombre,
      clientName: buildClientNameFromForm({ ...form, clientNombre: nombre }),
    })
  }

  function handleApellidosChange(apellidos: string) {
    onChange({
      clientApellidos: apellidos,
      clientName: buildClientNameFromForm({ ...form, clientApellidos: apellidos }),
    })
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    const validation = validateContractRegistration(newContractFormToRegistrationInput(form))
    const docValidation = validateRequiredDocumentos(form, documentosObligatorios)
    const missing = [...validation.missingLabels, ...docValidation.missingLabels]

    if (!validation.valid || !docValidation.valid) {
      setIncompleteMissing(missing)
      setIncompleteConfirmOpen(true)
      return
    }
    onSubmit(e, { incomplete: false })
  }

  function confirmIncompleteSave() {
    setIncompleteConfirmOpen(false)
    onSubmit({ preventDefault: () => {} } as FormEvent, { incomplete: true })
  }

  function handleClose() {
    setTariffSearch("")
    setEmpresaOpen(false)
    setIncompleteConfirmOpen(false)
    setIncompleteMissing([])
    setNewComment("")
    onClose()
  }

  function selectCompany(compania: string) {
    const companiaChanged = form.compania !== compania
    onChange({
      compania,
      wizardSegment: segment,
      wizardStep: "cliente",
      ...(companiaChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" } : {}),
    })
  }

  function selectTariff(tarifa: string) {
    const candidates = findMarcoTramoCandidates(marcoCatalog, {
      compania: form.compania,
      tarifa,
      tipo: form.tipo,
    })
    const resolution = resolveMarcoTramoForConsumo(
      candidates,
      form.consumoAnual === "" ? null : Number(form.consumoAnual)
    )
    const entry = resolution.entry ?? candidates[0]
    onChange({
      marcoEntryId: entry?.id ?? "",
      tarifa,
      tipoPrecio: inferTipoPrecioFromTarifa(tarifa),
      tipo: entry?.tipo ?? form.tipo,
      selectedServiciosExtras: [],
    })
  }

  function toggleServicioExtra(id: string) {
    const selected = form.selectedServiciosExtras
    onChange({
      selectedServiciosExtras: selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    })
  }

  function addDocumentosForTipo(tipoId: string, files: NewContractFormState["documentosPorTipo"][string]) {
    const current = form.documentosPorTipo[tipoId] ?? []
    onChange({
      documentosPorTipo: {
        ...form.documentosPorTipo,
        [tipoId]: [...current, ...files],
      },
    })
    toast.success(`${files.length} archivo(s) adjuntado(s)`)
  }

  function removeDocumentoForTipo(tipoId: string, index: number) {
    const current = [...(form.documentosPorTipo[tipoId] ?? [])]
    current.splice(index, 1)
    onChange({
      documentosPorTipo: {
        ...form.documentosPorTipo,
        [tipoId]: current,
      },
    })
  }

  function postComment() {
    const text = newComment.trim()
    if (!text) return
    onChange({
      comentariosInternos: [
        ...form.comentariosInternos,
        {
          id: `cmt-${Date.now()}`,
          authorRole: activeUserRole,
          authorName: activeUserName,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    })
    setNewComment("")
  }

  return {
    isCompanyStep,
    activeTab,
    segment,
    tariffSearch,
    setTariffSearch,
    empresaOpen,
    setEmpresaOpen,
    newComment,
    setNewComment,
    cpLookupLoading,
    incompleteConfirmOpen,
    setIncompleteConfirmOpen,
    incompleteMissing,
    companies,
    featuredCompanies,
    atRestCompanies,
    companySupplyTypes,
    filteredTariffs,
    documentosObligatorios,
    commissionEstimate,
    duplicateCups,
    tarifaChipLabel,
    goToTab,
    setSegment,
    setTipo,
    handleCodigoPostalChange,
    handlePotenciaP1Change,
    handleNombreChange,
    handleApellidosChange,
    handleFormSubmit,
    confirmIncompleteSave,
    handleClose,
    selectCompany,
    selectTariff,
    isLastWizardStep,
    goNextStep,
    setPeajeSegment,
    serviciosExtrasExpanded,
    setServiciosExtrasExpanded,
    marcoTramoResolution,
    serviciosExtrasOptions,
    toggleServicioExtra,
    addDocumentosForTipo,
    removeDocumentoForTipo,
    postComment,
  }
}
