import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { marcoRetributivoCatalog, type MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import { estimateMarcoCommissionEur } from "@/lib/marco-commission"
import {
  getDocumentosObligatoriosForMarco,
  validateRequiredDocumentos,
} from "@/lib/contrato-documentos"
import {
  filterMarcoTariffs,
  getWizardCompanies,
  type ContractWizardSegment,
} from "@/lib/contract-tariff-filter"
import type { NewContractFormState, WizardStep } from "@/lib/contract-registration"
import {
  buildClientNameFromForm,
  inferTipoPrecioFromTarifa,
  newContractFormToRegistrationInput,
  validateContractRegistration,
} from "@/lib/contract-registration"
import { getTariffPeajeType, inferPeajeTypeFromSegment, spreadPotenciaFromP1 } from "@/lib/contract-potencia"
import { lookupSpainPostalCode } from "@/lib/spain-postal-code"
import type { NuevoContratoWizardProps } from "@/pages/erp/contratos/components/wizard/wizard-types"
import { tipoClienteChipLabel } from "@/pages/erp/contratos/components/wizard/wizard-ui"
import { listMarcoRetributivo, marcoRowToCatalogEntry } from "@/lib/supabase/marco-retributivo"

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
  const [marcoCatalog, setMarcoCatalog] = useState<MarcoRetributivoEntry[]>(marcoRetributivoCatalog)
  const cpLookupRequestId = useRef(0)

  useEffect(() => {
    if (!open) return
    void listMarcoRetributivo().then((result) => {
      if (result.ok && result.data.length > 0) {
        setMarcoCatalog(result.data.map(marcoRowToCatalogEntry))
      }
    })
  }, [open])

  function goToTab(tab: Exclude<WizardStep, 1>) {
    onChange({ wizardStep: tab })
  }

  function setSegment(next: ContractWizardSegment) {
    const segmentChanged = form.wizardSegment !== next
    onChange({
      wizardSegment: next,
      ...(segmentChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" } : {}),
    })
  }

  const companies = useMemo(() => getWizardCompanies(segment, marcoCatalog), [segment, marcoCatalog])

  const filteredTariffs = useMemo(
    () =>
      filterMarcoTariffs({
        compania: form.compania,
        segment,
        tipo: form.tipo,
        tipoCliente: form.tipoCliente,
        search: tariffSearch,
        catalog: marcoCatalog,
      }),
    [form.compania, form.tipo, form.tipoCliente, segment, tariffSearch, marcoCatalog]
  )

  const selectedMarcoEntry = useMemo(() => {
    if (form.marcoEntryId) {
      return marcoCatalog.find((e) => e.id === form.marcoEntryId)
    }
    return marcoCatalog.find(
      (e) => e.compania === form.compania && e.tarifa === form.tarifa && e.tipo === form.tipo
    )
  }, [form.marcoEntryId, form.compania, form.tarifa, form.tipo, marcoCatalog])

  const documentosObligatorios = useMemo(
    () => getDocumentosObligatoriosForMarco(selectedMarcoEntry),
    [selectedMarcoEntry]
  )

  const commissionEstimate = useMemo(() => {
    if (!selectedMarcoEntry) return null
    const consumo = form.consumoAnual === "" ? 0 : Number(form.consumoAnual)
    if (!consumo || consumo <= 0) return null
    return estimateMarcoCommissionEur(
      selectedMarcoEntry,
      commissionPercentage,
      consumo,
      formatCurrency
    )
  }, [selectedMarcoEntry, commissionPercentage, form.consumoAnual, formatCurrency])

  const peajeType = getTariffPeajeType(selectedMarcoEntry?.peaje)
  const effectivePeajeType = peajeType ?? inferPeajeTypeFromSegment(form.wizardSegment)

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

  function selectTariff(entryId: string, tarifa: string) {
    const entry = marcoCatalog.find((e) => e.id === entryId)
    onChange({
      marcoEntryId: entryId,
      tarifa,
      tipoPrecio: inferTipoPrecioFromTarifa(tarifa),
      tipo: entry?.tipo ?? form.tipo,
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
    filteredTariffs,
    documentosObligatorios,
    commissionEstimate,
    duplicateCups,
    tarifaChipLabel,
    goToTab,
    setSegment,
    handleCodigoPostalChange,
    handlePotenciaP1Change,
    handleNombreChange,
    handleApellidosChange,
    handleFormSubmit,
    confirmIncompleteSave,
    handleClose,
    selectCompany,
    selectTariff,
    addDocumentosForTipo,
    removeDocumentoForTipo,
    postComment,
  }
}
