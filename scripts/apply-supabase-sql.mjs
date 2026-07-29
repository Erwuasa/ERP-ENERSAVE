#!/usr/bin/env node
/**
 * Aplica un archivo SQL al proyecto Supabase remoto.
 *
 * Opción A — URI directa (Settings → Database → Connection string):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@... npm run db:apply -- supabase/migrations/20260728000001_ensure_erp_comerciales_commission_percentage.sql
 *
 * Opción B — Personal Access Token (https://supabase.com/dashboard/account/tokens):
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run db:apply -- path/to/file.sql
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import dotenv from "dotenv"

dotenv.config()

const fileArg = process.argv[2]
if (!fileArg) {
  console.error("Uso: node scripts/apply-supabase-sql.mjs <archivo.sql>")
  process.exit(1)
}

const sql = readFileSync(resolve(fileArg), "utf8")
const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_URL?.replace("https://", "").split(".")[0]

async function applyViaDbUrl() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!dbUrl) return false

  const pg = await import("pg")
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    console.log("✓ Migración aplicada vía SUPABASE_DB_URL")
    return true
  } finally {
    await client.end()
  }
}

async function applyViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token || !projectRef) return false

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const body = await res.text()
  if (!res.ok) {
    console.error("Management API error:", res.status, body)
    return false
  }

  console.log("✓ Migración aplicada vía Supabase Management API")
  return true
}

const ok = (await applyViaDbUrl()) || (await applyViaManagementApi())

if (!ok) {
  console.error(`
No se pudo aplicar la migración automáticamente.

1) SQL Editor (recomendado): pega el contenido de:
   ${resolve(fileArg)}

2) O añade a .env una de estas variables y vuelve a ejecutar:
   SUPABASE_DB_URL=postgresql://...
   SUPABASE_ACCESS_TOKEN=sbp_...
`)
  process.exit(1)
}
