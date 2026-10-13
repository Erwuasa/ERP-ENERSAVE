import { describe, expect, it } from "vitest"
import {
  buildContractWizardMetadata,
  EMPTY_NEW_CONTRACT_FORM,
  isWizardCompanyClient,
  wizardShowsNacionalidad,
} from "./contract-registration"
import { resolveWizardTariffClave } from "./contract-tariff-filter"

describe("wizard Enertech fields", () => {
  it("treats pyme and comunidad as a company alta", () => {
    expect(isWizardCompanyClient({ wizardSegment: "pyme", tipoCliente: "autonomo" })).toBe(true)
    expect(isWizardCompanyClient({ wizardSegment: "residencial", tipoCliente: "comunidad_vecinos" })).toBe(
      true
    )
    expect(isWizardCompanyClient({ wizardSegment: "residencial", tipoCliente: "autonomo" })).toBe(false)
  })

  it("asks for nationality when the document is a NIE", () => {
    expect(wizardShowsNacionalidad("X")).toBe(true)
    expect(wizardShowsNacionalidad("12345678Z")).toBe(false)
    expect(wizardShowsNacionalidad("B12345674")).toBe(false)
  })

  it("stores the Enertech alta fields in the contract metadata", () => {
    const metadata = buildContractWizardMetadata({
      ...EMPTY_NEW_CONTRACT_FORM,
      cnae: "4711",
      nacionalidad: "Francia",
      apoderadoNombre: "Ana Ruiz",
      apoderadoDni: "12345678z",
      claveTarifa: "tf_endesa_luz",
      clientNombre: "Ana",
      clientApellidos: "Ruiz",
      razonSocial: "Tienda SL",
    })

    expect(metadata).toMatchObject({
      cnae: "4711",
      nacionalidad: "Francia",
      apoderado_nombre: "Ana Ruiz",
      apoderado_dni: "12345678Z",
      clave_tarifa: "tf_endesa_luz",
      contact_nombre: "Ana",
      contact_apellidos: "Ruiz",
      razon_social: "Tienda SL",
    })
  })

  it("keeps the price-catalog key of the selected peaje", () => {
    const clave = resolveWizardTariffClave(
      [
        { id: "tf_20", tarifa: "LUZ 24H", peaje: "2.0TD" },
        { id: "tf_30", tarifa: "LUZ 24H", peaje: "3.0TD" },
      ],
      "LUZ 24H",
      "3.0"
    )
    expect(clave).toBe("tf_30")
  })
})