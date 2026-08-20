import { useCallback, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import type { Contract } from "@/types/contract"
import type { ContractOcrResult } from "@/lib/contract-ocr"
import {
  EMPTY_NEW_CONTRACT_FORM,
  inferTipoPrecioFromTarifa,
  type NewContractFormState,
} from "@/lib/contract-registration"
import { getTariffPeajeType, spreadPotenciaFromP1 } from "@/lib/contract-potencia"
import { buildNewContractFormFromProspecto } from "@/lib/ventas/prospecto-to-contract"
import type { ProductoTarifa } from "@/lib/productos-catalog"
import type { Prospecto } from "@/lib/ventas/types"
import type { Settlement } from "@/types/settlement"
import { formatCurrency } from "@/lib/erp/format-currency"
import {
  buildClawbackPendingContract,
  computeClawback,
} from "@/lib/erp/contract-clawback"
import { buildActivationDistribution } from "@/lib/erp/contract-activation"
import { createContractFromForm } from "@/lib/erp/create-contract-from-form"
import {
  buildOcrFormPatch,
  buildResetNewContractForm,
} from "@/lib/erp/new-contract-form-utils"

export interface UseContractActionsOptions {}

export function useContractActions(_options: UseContractActionsOptions = {}) {
  const { profiles, activeUserId, activeUser } = useAuth()
  const {
    contracts,
    setContracts,
    clients,
    setClients,
    settlements,
    setSettlements,
    setPendingContracts,
  } = useErpData()

  const activeRole = activeUser.role

  const [newContractForm, setNewContractForm] = useState<NewContractFormState>(() => ({
    ...EMPTY_NEW_CONTRACT_FORM,
    fechaInicio: new Date().toISOString().split("T")[0],
  }))
  const [contractWizardOpen, setContractWizardOpen] = useState(false)
  const [contractWizardProspectoId, setContractWizardProspectoId] = useState<string | null>(
    null
  )
  const [isCreatingContract, setIsCreatingContract] = useState(false)

  const [isActivateOpen, setIsActivateOpen] = useState(false)
  const [selectedContractForActivation, setSelectedContractForActivation] =
    useState<Contract | null>(null)
  const [activatePowerKw, setActivatePowerKw] = useState(15)
  const [activateConsumoKwh, setActivateConsumoKwh] = useState(25000)
  const [isActivatingContractLoading, setIsActivatingContractLoading] = useState(false)

  const [isBajaOpen, setIsBajaOpen] = useState(false)
  const [selectedContractForBaja, setSelectedContractForBaja] = useState<Contract | null>(null)
  const [bajaDate, setBajaDate] = useState(() => new Date().toISOString().split("T")[0])
  const [isBajaLoading, setIsBajaLoading] = useState(false)

  const patchNewContractForm = useCallback((patch: Partial<NewContractFormState>) => {
    setNewContractForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetNewContractForm = useCallback(() => {
    setNewContractForm(buildResetNewContractForm(profiles, activeUserId))
  }, [profiles, activeUserId])

  const applyOcrToNewContractForm = useCallback(
    (data: ContractOcrResult) => {
      patchNewContractForm(buildOcrFormPatch(data))
    },
    [patchNewContractForm]
  )

  const openContractWizardBlank = useCallback(() => {
    resetNewContractForm()
    setContractWizardProspectoId(null)
    setContractWizardOpen(true)
  }, [resetNewContractForm])

  const openContractWizardFromProducto = useCallback(
    (product: ProductoTarifa) => {
      const user = profiles.find((p) => p.id === activeUserId) || profiles[0]
      const jefe = profiles.find((p) => p.id === user.managerId)
      const peajeType = getTariffPeajeType(product.peaje)
      const energiaP1 = product.precios.energia.p1
      const potenciaP1 = product.precios.potencia.p1

      resetNewContractForm()
      patchNewContractForm({
        compania: product.compania,
        tarifa: product.tarifa,
        tipo: product.tipo,
        marcoEntryId: product.id,
        wizardStep: "cliente",
        wizardSegment: product.wizardSegment,
        tipoCliente: product.tipoCliente,
        tipoPrecio: inferTipoPrecioFromTarifa(product.tarifa),
        ...(energiaP1 != null ? { precioFijoConsumo: String(energiaP1) } : {}),
        ...(potenciaP1 != null
          ? {
              potenciaContratada: String(potenciaP1),
              ...spreadPotenciaFromP1(String(potenciaP1), peajeType),
            }
          : {}),
        nombreComercial: user.fullName,
        jefeEquipo: jefe?.fullName ?? "",
      })
      setContractWizardProspectoId(null)
      setContractWizardOpen(true)
    },
    [profiles, activeUserId, resetNewContractForm, patchNewContractForm]
  )

  const openContractWizardForProspecto = useCallback(
    (prospecto: Prospecto) => {
      const user = profiles.find((p) => p.id === activeUserId) || profiles[0]
      const jefe = profiles.find((p) => p.id === user.managerId)
      patchNewContractForm({
        ...EMPTY_NEW_CONTRACT_FORM,
        fechaInicio: new Date().toISOString().split("T")[0],
        ...buildNewContractFormFromProspecto(prospecto, {
          nombreComercial: user.fullName,
          jefeEquipo: jefe?.fullName ?? "",
        }),
      })
      setContractWizardProspectoId(prospecto.id)
      setContractWizardOpen(true)
    },
    [profiles, activeUserId, patchNewContractForm]
  )

  const closeContractWizard = useCallback(() => {
    setContractWizardOpen(false)
    setContractWizardProspectoId(null)
    resetNewContractForm()
  }, [resetNewContractForm])

  const handleCreateContract = useCallback(
    async (
      e: FormEvent,
      onSuccess?: () => void,
      createOptions?: { incomplete?: boolean; prospectoId?: string }
    ) => {
      e.preventDefault()
      setIsCreatingContract(true)

      try {
        const result = await createContractFromForm({
          form: newContractForm,
          contracts,
          clients,
          settlements,
          profiles,
          activeUserId,
          activeUserName: activeUser.fullName,
          activeRole,
          options: createOptions,
        })

        if (result.ok === false) {
          toast.error(result.message)
          return
        }

        setClients(result.clients)
        setContracts(result.contracts)
        if (result.settlement) {
          setSettlements((prev) => [result.settlement!, ...prev])
        }

        for (const warning of result.warnings) {
          if (warning.includes("Supabase pendiente") || warning.includes("Borrador")) {
            toast.message(warning)
          } else {
            toast.warning(warning)
          }
        }

        resetNewContractForm()
        onSuccess?.()

        toast.success(
          result.isIncomplete
            ? "Contrato guardado como pendiente de información."
            : `¡Contrato registrado! Liquidación de ${formatCurrency(result.externalMargin)} para ${result.sellerName}.`
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al guardar el contrato"
        toast.error(msg)
      } finally {
        setIsCreatingContract(false)
      }
    },
    [
      newContractForm,
      contracts,
      clients,
      settlements,
      profiles,
      activeUserId,
      activeUser.fullName,
      activeRole,
      setClients,
      setContracts,
      setSettlements,
      resetNewContractForm,
    ]
  )

  const openActivateModal = useCallback((contract: Contract) => {
    setSelectedContractForActivation(contract)
    setActivateConsumoKwh(contract.consumoAnual)
    setActivatePowerKw(15.5)
    setIsActivateOpen(true)
  }, [])

  const closeActivateModal = useCallback(() => {
    setIsActivateOpen(false)
    setSelectedContractForActivation(null)
  }, [])

  const handleActivateAndDistribute = useCallback(
    (contractId: string, consumoKwh: number, potenciaKw: number) => {
      const contract = contracts.find((c) => c.id === contractId)
      if (!contract) return

      setIsActivatingContractLoading(true)

      setTimeout(() => {
        const today = new Date().toISOString().split("T")[0]
        const { updatedContract, settlements: newSettlements, comercialShare, jefeShare } =
          buildActivationDistribution(contract, consumoKwh, potenciaKw, profiles, today)

        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? updatedContract : c))
        )
        setSettlements((prev) => [...newSettlements, ...prev])
        setIsActivatingContractLoading(false)
        closeActivateModal()
        toast.success(
          `¡Contrato activado de forma oficial! Comisión neta repartida: Asesor (50%: ${formatCurrency(comercialShare)}) y Jefe (20%: ${formatCurrency(jefeShare)}).`
        )
      }, 600)
    },
    [contracts, profiles, setContracts, setSettlements, closeActivateModal]
  )

  const openBajaModal = useCallback((contract: Contract) => {
    setSelectedContractForBaja(contract)
    setBajaDate(new Date().toISOString().split("T")[0])
    setIsBajaOpen(true)
  }, [])

  const closeBajaModal = useCallback(() => {
    setIsBajaOpen(false)
    setSelectedContractForBaja(null)
  }, [])

  const handleCancelContract = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!selectedContractForBaja) return

      const clawback = computeClawback(selectedContractForBaja, bajaDate)
      if (clawback.isInvalidDate) {
        toast.error("La fecha de baja no puede ser anterior a la fecha de activación.")
        return
      }

      setIsBajaLoading(true)
      const contract = selectedContractForBaja

      setTimeout(() => {
        setIsBajaLoading(false)

        setContracts((prev) =>
          prev.map((item) =>
            item.id === contract.id
              ? {
                  ...item,
                  estado: "Dado de Baja",
                  fechaBaja: bajaDate,
                  retrocomisionClawback: clawback.clawbackAmount,
                }
              : item
          )
        )

        const negativeSettlement: Settlement = {
          id: `liq-baja-${Date.now()}`,
          comercialId: contract.comercialId,
          comercialName: contract.comercialName,
          montoInterno: -clawback.internalClawback,
          montoExterno: -clawback.clawbackAmount,
          estado: "pendiente",
          tipo: contract.tipo,
          descripcion: `Retrocomisión Proporcional - Baja de ${contract.clientName} (${contract.compania}) tras ${clawback.diffMonths.toFixed(1)}/${clawback.limitMonths} meses (${(clawback.clawbackPercent * 100).toFixed(0)}% de penalización)`,
          createdAt: bajaDate,
          contractId: contract.id,
        }
        setSettlements((prev) => [negativeSettlement, ...prev])

        if (clawback.clawbackAmount > 0) {
          setPendingContracts((prev) => [
            buildClawbackPendingContract(contract, bajaDate, clawback),
            ...prev,
          ])
        }

        closeBajaModal()
        toast.success(
          `Contrato dado de baja con éxito. Se calculó una retrocomisión de -${formatCurrency(clawback.clawbackAmount)} (${(clawback.clawbackPercent * 100).toFixed(0)}% penalización) y se registró como saldo negativo.`
        )
      }, 750)
    },
    [
      selectedContractForBaja,
      bajaDate,
      setContracts,
      setSettlements,
      setPendingContracts,
      closeBajaModal,
    ]
  )

  return {
    newContractForm,
    patchNewContractForm,
    resetNewContractForm,
    applyOcrToNewContractForm,
    contractWizardOpen,
    contractWizardProspectoId,
    closeContractWizard,
    openContractWizardBlank,
    openContractWizardFromProducto,
    openContractWizardForProspecto,
    handleCreateContract,
    isCreatingContract,
    isActivateOpen,
    selectedContractForActivation,
    activatePowerKw,
    setActivatePowerKw,
    activateConsumoKwh,
    setActivateConsumoKwh,
    isActivatingContractLoading,
    openActivateModal,
    closeActivateModal,
    handleActivateAndDistribute,
    isBajaOpen,
    selectedContractForBaja,
    bajaDate,
    setBajaDate,
    isBajaLoading,
    openBajaModal,
    closeBajaModal,
    handleCancelContract,
  }
}

export type ContractActionsValue = ReturnType<typeof useContractActions>
