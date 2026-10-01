#!/usr/bin/env npx tsx
/**
 * Importa CRM Aenergetic.xlsx a Supabase (contratos_equipo + clientes).
 *
 *   npx tsx scripts/import-crm-aenergetic.ts "/ruta/CRM Aenergetic.xlsx"
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { syncCrmExcelBufferToSupabase } from "../src/lib/erp/sync-crm-excel-import"

dotenv.config()

const filePath = process.argv[2]
if (!filePath) {
  console.error("Uso: npx tsx scripts/import-crm-aenergetic.ts <CRM Aenergetic.xlsx>")
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error("Faltan VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o anon key) en .env")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const buf = readFileSync(resolve(filePath))
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

const result = await syncCrmExcelBufferToSupabase(supabase, ab, {
  fallbackComercialId: "83cabea3-8cbb-4c57-b300-9ecc38410882",
  fallbackComercialName: "Ricardo Monsalve Gonzalez",
})

console.log(JSON.stringify(result, null, 2))
if (result.errors.length) process.exit(1)
