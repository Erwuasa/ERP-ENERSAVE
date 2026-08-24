import {
  formatEuro,
  type TarifaPrecioTipo,
} from "./comparador-email-helpers"
import { GEMINI_FLASH_MODEL, getGeminiClient, isGeminiConfigured } from "./gemini-client"

export interface EmailPropuestaInput {
  clienteNombre: string
  contactoNombre?: string
  empresaNombre?: string
  tarifaActual: { compania: string; tipo: TarifaPrecioTipo }
  tarifaPropuesta: { compania: string; tipo: TarifaPrecioTipo }
  ahorroAnualEur: number
  ahorroPct: number
  periodosMayorConsumo?: string[]
}

export interface EmailPropuestaResult {
  asunto: string
  cuerpo: string
}

function describeCambioTipo(
  actual: TarifaPrecioTipo,
  propuesta: TarifaPrecioTipo
): string | null {
  if (actual === propuesta) return null
  if (propuesta === "indexado") {
    return "Pasamos de una tarifa fija a una indexada: pagarás según el precio del mercado en cada momento, con más transparencia si tu consumo se concentra fuera de las horas punta."
  }
  return "Pasamos de una tarifa indexada a una fija: tendrás un precio estable que te da previsibilidad en la factura mes a mes."
}

function buildFallbackEmail(input: EmailPropuestaInput): EmailPropuestaResult {
  const contacto = input.contactoNombre?.trim() || input.clienteNombre.trim() || "cliente"
  const empresa = input.empresaNombre?.trim()
  const saludo = empresa ? `${contacto} (${empresa})` : contacto
  const cambio = describeCambioTipo(input.tarifaActual.tipo, input.tarifaPropuesta.tipo)
  const periodos =
    input.periodosMayorConsumo && input.periodosMayorConsumo.length > 0
      ? ` Vuestros periodos de mayor consumo (${input.periodosMayorConsumo.join(" y ")}) encajan bien con esta propuesta.`
      : ""

  const cuerpo = [
    `Hola ${saludo},`,
    "",
    `Tras revisar vuestro suministro con ${input.tarifaActual.compania} (${input.tarifaActual.tipo}), hemos encontrado una alternativa con ${input.tarifaPropuesta.compania} (${input.tarifaPropuesta.tipo}) que encaja mejor con vuestro perfil.${periodos}`,
    cambio ? cambio : "",
    `El ahorro estimado ronda ${formatEuro(input.ahorroAnualEur)} al año (aprox. ${input.ahorroPct}%).`,
    "",
    "Si te encaja, podemos agendar una llamada breve para revisar los detalles y dar el siguiente paso.",
    "",
    "Un saludo,",
    "Equipo ENerSave",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    asunto: `Propuesta de ahorro energético — ${input.tarifaPropuesta.compania}`,
    cuerpo,
  }
}

function buildPrompt(input: EmailPropuestaInput): string {
  const contacto = input.contactoNombre?.trim() || input.clienteNombre.trim() || "cliente"
  const empresa = input.empresaNombre?.trim() || input.clienteNombre.trim() || "su empresa"
  const periodos =
    input.periodosMayorConsumo && input.periodosMayorConsumo.length > 0
      ? input.periodosMayorConsumo.join(", ")
      : "no especificados"

  return `Eres un comercial de energía de ENerSave. Redacta un email breve y profesional en español (España).

Destinatario: ${contacto} de ${empresa}.
Situación actual: tarifa ${input.tarifaActual.tipo} con ${input.tarifaActual.compania}.
Propuesta: tarifa ${input.tarifaPropuesta.tipo} con ${input.tarifaPropuesta.compania}.
Ahorro estimado: ${formatEuro(input.ahorroAnualEur)} al año (${input.ahorroPct}%).
Periodos de mayor consumo del cliente: ${periodos}.

Requisitos del email:
- 2-3 frases explicando por qué la propuesta conviene más que la situación actual para ESTE caso.
- Si cambia de fijo a indexado o viceversa, explícalo en términos sencillos (máximo una frase, sin jerga técnica).
- Menciona el ahorro estimado de forma natural.
- Cierra con una llamada a la acción para agendar una llamada.
- Firma exactamente como "Equipo ENerSave".
- Tono cercano pero profesional. Sin markdown ni viñetas.

Responde SOLO con un JSON válido (sin markdown) con esta forma:
{"asunto":"...","cuerpo":"..."}`
}

function parseEmailJson(raw: string): EmailPropuestaResult | null {
  const trimmed = raw.trim()
  const jsonBlock = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonBlock) return null

  try {
    const parsed = JSON.parse(jsonBlock[0]) as { asunto?: string; cuerpo?: string }
    if (!parsed.asunto?.trim() || !parsed.cuerpo?.trim()) return null
    return { asunto: parsed.asunto.trim(), cuerpo: parsed.cuerpo.trim() }
  } catch {
    return null
  }
}

export async function generarEmailPropuesta(
  input: EmailPropuestaInput
): Promise<EmailPropuestaResult> {
  if (!isGeminiConfigured()) {
    return buildFallbackEmail(input)
  }

  try {
    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: buildPrompt(input),
    })

    const text = response.text?.trim()
    if (!text) return buildFallbackEmail(input)

    const parsed = parseEmailJson(text)
    return parsed ?? buildFallbackEmail(input)
  } catch (error) {
    console.error("[generarEmailPropuesta]", error)
    return buildFallbackEmail(input)
  }
}
