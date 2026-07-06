import type { NewContractFormState } from "../contract-registration"
import { inferTipoPrecioFromTarifa } from "../contract-registration"
import { FUNNEL_ORDER } from "./pipeline"
import type { Prospecto } from "./types"

export interface ProspectoContractPrecargaContext {
  nombreComercial: string
  jefeEquipo?: string
}

export function shouldOfferContractWizard(prospecto: Prospecto): boolean {
  if (prospecto.contratoEquipoId) return false
  const tramIdx = FUNNEL_ORDER.indexOf("tramitacion")
  const faseIdx = FUNNEL_ORDER.indexOf(
    prospecto.fase as (typeof FUNNEL_ORDER)[number]
  )
  if (tramIdx === -1 || faseIdx === -1) return false
  return faseIdx >= tramIdx
}

export function buildNewContractFormFromProspecto(
  prospecto: Prospecto,
  ctx: ProspectoContractPrecargaContext
): Partial<NewContractFormState> {
  const tarifa = prospecto.propuestaTarifa ?? prospecto.tarifaActual ?? ""
  const compania = prospecto.propuestaCompania ?? prospecto.companiaActual ?? ""
  const consumo =
    prospecto.consumoAnualKwh != null ? prospecto.consumoAnualKwh : ""
  const wizardSegment =
    typeof consumo === "number" && consumo > 15000 ? "pyme" : "residencial"

  const patch: Partial<NewContractFormState> = {
    clientName: prospecto.nombre,
    telefono: prospecto.telefono ?? "",
    email: prospecto.email ?? "",
    nif: prospecto.nif ?? "",
    cups: prospecto.cups ? prospecto.cups.toUpperCase().trim() : "",
    tipo: prospecto.tipoSuministro === "gas" ? "gas" : "luz",
    compania,
    tarifa,
    consumoAnual: consumo,
    direccionSuministro: prospecto.direccion ?? "",
    direccionFiscal: prospecto.direccion ?? "",
    codigoPostal: prospecto.codigoPostal ?? "",
    poblacion: prospecto.poblacion ?? "",
    provincia: prospecto.provincia ?? "",
    wizardSegment,
    wizardStep: 1,
    nombreComercial: ctx.nombreComercial,
    jefeEquipo: ctx.jefeEquipo ?? "",
    tipoCliente: wizardSegment === "pyme" ? "pyme" : "residencial",
  }

  if (tarifa) {
    patch.tipoPrecio = inferTipoPrecioFromTarifa(tarifa)
  }

  return patch
}
