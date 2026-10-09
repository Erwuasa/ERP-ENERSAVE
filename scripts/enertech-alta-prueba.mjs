import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const TEST_BASE_URL = "https://devintranet.enertechcore.com/v1"

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const name = trimmed.slice(0, eq).trim()
    if (process.env[name]) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[name] = value
  }
}

loadEnvFile(".env")

const key = process.env.ENERTECH_API_KEY?.trim()
if (!key) {
  console.error("Falta ENERTECH_API_KEY en .env.")
  console.error("Tiene que ser la clave del entorno de pruebas (devintranet), no la de producción que ya usa SIPS.")
  console.error("Añade una línea ENERTECH_API_KEY=... en .env y vuelve a lanzar npm run enertech:alta-prueba.")
  process.exit(1)
}

process.env.ENERTECH_ALTA_LIVE = "1"
process.env.ENERTECH_API_BASE_URL = TEST_BASE_URL

const child = spawn(
  "npx",
  ["vitest", "run", "src/lib/enertech/contract-alta.live.test.ts"],
  { stdio: "inherit", env: process.env }
)
child.on("exit", (code) => process.exit(code ?? 1))
