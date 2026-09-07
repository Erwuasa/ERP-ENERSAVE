import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Dispatch, SetStateAction } from "react"
import type { Profile, UserRole } from "@/types/profile"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import {
  erpComercialFromProfile,
  fiscalFormFromComercial,
  isComercialFiscalProfileComplete,
  type ComercialFiscalForm,
} from "@/lib/comercial-fiscal-profile"
import {
  formatAutofacturaFecha,
  getAutofacturaPeriodoFacturacion,
  getProximaFechaAutofactura,
  type AutofacturaTipoCliente,
} from "@/lib/autofactura-scheduler"
import {
  buildAutofacturaLiquidacionFromRows,
  filterPendingAutofacturaRows,
  hasPendingAutofacturaRows,
} from "@/lib/autofactura-liquidaciones"
import { persistAutofacturaRecord } from "@/lib/autofactura-records"
import { normalizeTipoClienteSegment } from "@/lib/contract-segment-rules"
import { enrichSettlementRow, type ProfileRow } from "@/lib/liquidaciones-internas"
import { downloadAutofacturaPdf, generateAutofacturaPdf } from "@/lib/pdf/autofactura-pdf"
import { listMarcoRetributivo } from "@/lib/supabase/marco-retributivo"

interface Params {
  activeUser: Profile
  activeUserId: string
  activeRole: UserRole
  superadminViewMode: "tramitacion" | "comercial"
  contracts: Contract[]
  settlements: Settlement[]
  profiles: Profile[]
  setProfiles: Dispatch<SetStateAction<Profile[]>>
  formatCurrency: (value: number) => string
}

function mapProfilesToLiquidacionRows(profiles: Profile[]): ProfileRow[] {
  return profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.fullName,
    role: profile.role,
    managerId: profile.managerId,
    commissionPercentage: profile.commissionPercentage,
    status: profile.status,
  }))
}

export function useErpFiscalProfile({
  activeUser,
  activeUserId,
  activeRole,
  superadminViewMode,
  contracts,
  settlements,
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

  const autofacturaPeriodo = useMemo(
    () => getAutofacturaPeriodoFacturacion(autofacturaTipoCliente),
    [autofacturaTipoCliente]
  )

  const proximaFechaAutofacturaLabel = formatAutofacturaFecha(
    getProximaFechaAutofactura(autofacturaTipoCliente)
  )

  const profileRows = useMemo(() => mapProfilesToLiquidacionRows(profiles), [profiles])

  const liquidacionRowsForAutofactura = useMemo(
    () =>
      settlements
        .filter((settlement) => settlement.comercialId === activeUserId)
        .map((settlement) =>
          enrichSettlementRow(settlement, contracts, profileRows, formatCurrency)
        ),
    [settlements, contracts, profileRows, activeUserId, formatCurrency]
  )

  const autofacturaEnabled = useMemo(
    () =>
      hasPendingAutofacturaRows(
        liquidacionRowsForAutofactura,
        autofacturaPeriodo,
        activeUserId
      ),
    [liquidacionRowsForAutofactura, autofacturaPeriodo, activeUserId]
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
    if (!autofacturaEnabled) {
      toast.info("No tienes liquidaciones pendientes de cobro este periodo.")
      return
    }

    const marcos = await listMarcoRetributivo()
    const marcoRows = marcos.ok ? marcos.data : []
    const enrichedRows = settlements
      .filter((settlement) => settlement.comercialId === activeUserId)
      .map((settlement) =>
        enrichSettlementRow(settlement, contracts, profileRows, formatCurrency, marcoRows)
      )

    const pendingRows = filterPendingAutofacturaRows(
      enrichedRows,
      autofacturaPeriodo,
      activeUserId
    )

    const liquidacion = buildAutofacturaLiquidacionFromRows(
      enrichedRows,
      autofacturaPeriodo,
      activeUserId,
      activeUser.fullName
    )

    if (liquidacion.desglosePorContrato.length === 0) {
      toast.info("No hay liquidaciones pendientes de cobro en este periodo.")
      return
    }

    const comercial = erpComercialFromProfile(activeUser)
    const blob = await generateAutofacturaPdf(comercial, liquidacion, {
      mes: autofacturaPeriodo.mes,
      año: autofacturaPeriodo.año,
      proximaFechaEmisionLabel: proximaFechaAutofacturaLabel,
    })
    downloadAutofacturaPdf(
      blob,
      comercial.fullName,
      autofacturaPeriodo.mes,
      autofacturaPeriodo.año
    )

    await persistAutofacturaRecord({
      comercialId: activeUserId,
      comercialName: activeUser.fullName,
      periodoMes: autofacturaPeriodo.mes,
      periodoAnio: autofacturaPeriodo.año,
      settlementIds: pendingRows.map((item) => item.settlement.id),
      totalComisionado: liquidacion.totalComisionado,
    })

    toast.success("Autofactura generada correctamente.")
  }, [
    autofacturaEnabled,
    settlements,
    contracts,
    profileRows,
    activeUser,
    activeUserId,
    formatCurrency,
    autofacturaPeriodo,
    proximaFechaAutofacturaLabel,
  ])

  return {
    perfilComercialOpen,
    fiscalForm,
    canEditFiscalProfile,
    canGenerateAutofactura,
    autofacturaEnabled,
    activeUserFiscalComplete,
    autofacturaTipoCliente,
    autofacturaPeriodo,
    proximaFechaAutofacturaLabel,
    openFiscalProfile,
    closeFiscalProfile,
    handleSaveFiscalProfile,
    handleGenerateAutofactura,
  }
}
