import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Dispatch, SetStateAction } from "react"
import type { Profile, UserRole } from "@/types/profile"
import type { Contract } from "@/types/contract"
import {
  erpComercialFromProfile,
  fiscalFormFromComercial,
  isComercialFiscalProfileComplete,
  type ComercialFiscalForm,
} from "@/lib/comercial-fiscal-profile"
import {
  formatAutofacturaFecha,
  getProximaFechaAutofactura,
  type AutofacturaTipoCliente,
} from "@/lib/autofactura-scheduler"
import { normalizeTipoClienteSegment } from "@/lib/contract-segment-rules"
import {
  calcularLiquidacionMensualPorComercial,
  erpComercialFromProfile as mapProfileToLiquidacionComercial,
} from "@/lib/liquidaciones-mensuales"
import { downloadAutofacturaPdf, generateAutofacturaPdf } from "@/lib/pdf/autofactura-pdf"

interface Params {
  activeUser: Profile
  activeUserId: string
  activeRole: UserRole
  superadminViewMode: "tramitacion" | "comercial"
  contracts: Contract[]
  profiles: Profile[]
  setProfiles: Dispatch<SetStateAction<Profile[]>>
  formatCurrency: (value: number) => string
}

export function useErpFiscalProfile({
  activeUser,
  activeUserId,
  activeRole,
  superadminViewMode,
  contracts,
  profiles,
  setProfiles,
  formatCurrency,
}: Params) {
  const [perfilComercialOpen, setPerfilComercialOpen] = useState(false)

  const canEditFiscalProfile =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    (activeRole === "superadmin" && superadminViewMode === "comercial")

  const canGenerateAutofactura = canEditFiscalProfile

  const activeUserFiscalComplete = useMemo(
    () => isComercialFiscalProfileComplete(erpComercialFromProfile(activeUser)),
    [activeUser]
  )

  const fiscalForm = useMemo(
    () => fiscalFormFromComercial(erpComercialFromProfile(activeUser)),
    [activeUser]
  )

  const autofacturaTipoCliente = useMemo((): AutofacturaTipoCliente => {
    const mine = contracts.filter((c) => c.comercialId === activeUserId)
    if (mine.length === 0) return "residencial"
    let pymeCount = 0
    for (const contract of mine) {
      const segment = normalizeTipoClienteSegment({
        tipoCliente: contract.tipoCliente,
        compania: contract.compania,
        clientName: contract.clientName,
        nif: contract.nif,
      })
      if (segment === "pyme" || segment === "autonomo") pymeCount += 1
    }
    return pymeCount > mine.length / 2 ? "pyme" : "residencial"
  }, [contracts, activeUserId])

  const proximaFechaAutofacturaLabel = formatAutofacturaFecha(
    getProximaFechaAutofactura(autofacturaTipoCliente)
  )

  const openFiscalProfile = useCallback(() => setPerfilComercialOpen(true), [])
  const closeFiscalProfile = useCallback(() => setPerfilComercialOpen(false), [])

  const handleSaveFiscalProfile = useCallback(
    (form: ComercialFiscalForm) => {
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === activeUserId
            ? {
                ...profile,
                dni: form.dni,
                direccion: form.direccion,
                ciudad: form.ciudad,
                codigoPostal: form.codigoPostal,
                telefono: form.telefono,
                iban: form.iban,
              }
            : profile
        )
      )
    },
    [activeUserId, setProfiles]
  )

  const handleGenerateAutofactura = useCallback(async () => {
    const now = new Date()
    const mes = now.getMonth() + 1
    const año = now.getFullYear()
    const comerciales = profiles
      .filter(
        (profile) =>
          profile.role === "comercial" ||
          profile.role === "jefe_comercial" ||
          profile.role === "superadmin"
      )
      .map((profile) =>
        mapProfileToLiquidacionComercial({
          id: profile.id,
          fullName: profile.fullName,
          commissionPercentage: profile.commissionPercentage,
          status: profile.status,
        })
      )

    const liquidacion = calcularLiquidacionMensualPorComercial(
      contracts,
      activeUserId,
      mes,
      año,
      comerciales,
      formatCurrency
    )

    if (liquidacion.desglosePorContrato.length === 0) {
      toast.info("No hay comisiones activadas este mes para autofacturar.")
      return
    }

    const comercial = erpComercialFromProfile(activeUser)
    const blob = await generateAutofacturaPdf(comercial, liquidacion, {
      mes,
      año,
      proximaFechaEmisionLabel: proximaFechaAutofacturaLabel,
    })
    downloadAutofacturaPdf(blob, comercial.fullName, mes, año)
    toast.success("Autofactura generada correctamente.")
  }, [
    contracts,
    profiles,
    activeUser,
    activeUserId,
    formatCurrency,
    proximaFechaAutofacturaLabel,
  ])

  return {
    perfilComercialOpen,
    fiscalForm,
    canEditFiscalProfile,
    canGenerateAutofactura,
    activeUserFiscalComplete,
    autofacturaTipoCliente,
    proximaFechaAutofacturaLabel,
    openFiscalProfile,
    closeFiscalProfile,
    handleSaveFiscalProfile,
    handleGenerateAutofactura,
  }
}
