#!/usr/bin/env node
/**
 * First-contact check for the Enertech API. Read-only: it never writes to Supabase.
 *
 *   node --env-file=.env scripts/enertech-smoke.mjs
 *   node --env-file=.env scripts/enertech-smoke.mjs --cups=ES0031408000000000AF   # also GET /sips (spends SIPS quota)
 *   node --env-file=.env scripts/enertech-smoke.mjs --edge                        # also call our enertech-* functions in explore mode
 *
 * Env: ENERTECH_API_KEY (required), ENERTECH_API_BASE_URL (default production; use
 * https://devintranet.enertechcore.com/v1 for tests). For --edge: VITE_SUPABASE_URL and ENERTECH_SYNC_SECRET.
 *
 * Personal data (clientes, contratos) is reported by field NAME only, never by value.
 */

const BASE = (process.env.ENERTECH_API_BASE_URL ?? 'https://intranet.enertechcore.com/v1').replace(/\/$/, '')
const KEY = process.env.ENERTECH_API_KEY?.trim()
const args = process.argv.slice(2)
const cupsArg = args.find((arg) => arg.startsWith('--cups='))?.slice('--cups='.length)
const withEdge = args.includes('--edge')

if (!KEY) {
  console.error('Falta ENERTECH_API_KEY. Ejecuta: node --env-file=.env scripts/enertech-smoke.mjs')
  process.exit(1)
}

const PERSONAL = new Set(['/clientes', '/contratos'])
const results = []

function listOf(body, preferred) {
  if (Array.isArray(body)) return body
  if (!body || typeof body !== 'object') return []
  for (const key of preferred) if (Array.isArray(body[key])) return body[key]
  return Object.values(body).find(Array.isArray) ?? []
}

function fieldNames(rows) {
  return [...new Set(rows.slice(0, 50).flatMap((row) => (row && typeof row === 'object' ? Object.keys(row) : [])))].sort()
}

async function check(path, { query = {}, preferred = ['items'], expectFields = [] } = {}) {
  const url = new URL(`${BASE}${path}`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)

  const started = Date.now()
  let status = 0
  let body = null
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': KEY, Accept: 'application/json' } })
    status = response.status
    body = await response.json().catch(() => null)
  } catch (error) {
    results.push({ path, ok: false, detail: `sin respuesta: ${error.message}` })
    return null
  }

  const rows = listOf(body, preferred)
  const fields = fieldNames(rows)
  const missing = expectFields.filter((field) => rows.length > 0 && !fields.includes(field))
  const ok = status >= 200 && status < 300 && missing.length === 0

  console.log(`\n${ok ? 'OK ' : 'FALLO'} GET ${path}${url.search} -> ${status} (${Date.now() - started} ms)`)
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    console.log('  claves de primer nivel:', Object.keys(body).join(', '))
    if (typeof body.total === 'number') console.log('  total reportado:', body.total)
    if (body.code || body.error) console.log('  error:', body.code ?? '', body.error ?? '')
  }
  if (rows.length) {
    console.log(`  filas en esta respuesta: ${rows.length}`)
    console.log('  campos:', fields.join(', '))
    if (!PERSONAL.has(path)) console.log('  primera fila:', JSON.stringify(rows[0]).slice(0, 400))
  }
  if (missing.length) console.log('  ATENCION: faltan campos que asumen los mapeadores:', missing.join(', '))

  results.push({ path, ok, detail: missing.length ? `faltan: ${missing.join(', ')}` : `${status}` })
  return body
}

console.log(`Enertech smoke test contra ${BASE}`)

await check('/perfil', { preferred: [] })
await check('/comercializadoras', { preferred: ['comercializadoras', 'items', 'filas'] })
await check('/tarifas-acceso', { preferred: ['tarifas_acceso'], expectFields: ['id_rate', 'nombre', 'producto'] })
await check('/precios', { query: { todas: '1' }, preferred: ['filas'], expectFields: ['clave', 'id', 'actualizado_en'] })
await check('/comisiones', { query: { todas: '1' }, preferred: ['filas'], expectFields: ['clave', 'id', 'actualizado_en'] })
await check('/clientes', { query: { limit: '5' }, expectFields: ['id_customer', 'nombre', 'dni_cif'] })
await check('/contratos', { query: { limit: '5' }, expectFields: ['id_contract', 'cups', 'cliente', 'estado', 'fecha_actualizacion'] })
await check('/webhooks', { preferred: ['webhooks'] })

if (cupsArg) await check('/sips', { query: { cups: cupsArg }, preferred: [] })

if (withEdge) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const secret = process.env.ENERTECH_SYNC_SECRET?.trim()
  if (!supabaseUrl || !secret) {
    console.log('\n--edge necesita VITE_SUPABASE_URL y ENERTECH_SYNC_SECRET en el entorno.')
  } else {
    for (const fn of [
      'enertech-perfil',
      'enertech-sync-comercializadoras',
      'enertech-sync-tarifas-acceso',
      'enertech-sync-precios',
      'enertech-sync-comisiones',
      'enertech-sync-clientes',
      'enertech-sync-contratos',
    ]) {
      const response = await fetch(`${supabaseUrl}/functions/v1/${fn}?mode=explore`, {
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => null)
      const body = response ? await response.json().catch(() => null) : null
      const ok = Boolean(response?.ok && body?.ok)
      console.log(
        `\n${ok ? 'OK ' : 'FALLO'} edge ${fn} (explore) -> ${response?.status ?? 'sin respuesta'}` +
          (body?.rows_received !== undefined
            ? ` | filas ${body.rows_received}, mapeables ${body.rows_mappable}, sin mapear ${body.rows_unmappable}`
            : '') +
          (body?.note ? `\n  ${body.note}` : '') +
          (!ok && body?.error ? `\n  ${body.code ?? ''} ${body.error}` : '')
      )
      results.push({ path: `edge:${fn}`, ok, detail: String(response?.status ?? 'sin respuesta') })
    }
  }
}

const failed = results.filter((result) => !result.ok)
console.log(`\nResumen: ${results.length - failed.length}/${results.length} correctos`)
for (const result of failed) console.log(`  - ${result.path}: ${result.detail}`)
process.exit(failed.length ? 1 : 0)
