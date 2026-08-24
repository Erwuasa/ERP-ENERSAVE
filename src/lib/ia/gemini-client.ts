import { GoogleGenAI } from "@google/genai"

let cachedClient: GoogleGenAI | null = null

function readGeminiApiKey(): string | undefined {
  const env = import.meta.env as ImportMetaEnv & { GEMINI_API_KEY?: string }
  const key = env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_API_KEY?.trim()
  return key || undefined
}

export function isGeminiConfigured(): boolean {
  return Boolean(readGeminiApiKey())
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = readGeminiApiKey()
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no configurada. Añádela en .env o .env.local (ver .env.example)."
    )
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey })
  }

  return cachedClient
}

export const GEMINI_FLASH_MODEL = "gemini-2.5-flash"
