import { corsHeadersFor, handleOptions } from '../_shared/cors.ts'
import {
  asString,
  asUuid,
  fetchAtChildList,
  fetchAtRecord,
  getSupabaseAdmin,
} from '../_shared/at-api.ts'
import { mapAtDocuments, mapAtEmails, mapAtEvents, mapAtNotes } from '../_shared/at-contract-children.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(request), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight

  try {
    if (request.method !== 'POST') {
      return json(request, { error: 'Method not allowed' }, 405)
    }

    const auth = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!auth) return json(request, { error: 'Unauthorized' }, 401)
    const admin = getSupabaseAdmin()
    const { data: userData, error: userError } = await admin.auth.getUser(auth)
    if (userError || !userData.user) {
      return json(request, { error: 'Unauthorized' }, 401)
    }

    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      body = {}
    }

    const atContractId = asUuid(body.at_contract_id ?? body.atContractId)
    if (!atContractId) {
      return json(request, { error: 'at_contract_id required' }, 400)
    }

    const [record, noteRows, eventRows, documentRows, emailRows] = await Promise.all([
      fetchAtRecord(`/contracts/${atContractId}`).catch((error) => {
        console.warn('[at-contract-notes] contract failed', error)
        return null
      }),
      fetchAtChildList(`/contracts/${atContractId}/notes`),
      fetchAtChildList(`/contracts/${atContractId}/events`),
      fetchAtChildList(`/contracts/${atContractId}/documents`),
      fetchAtChildList(`/contracts/${atContractId}/emails`),
    ])
    const notes = mapAtNotes(noteRows)
    const events = mapAtEvents(eventRows)
    const documents = mapAtDocuments(documentRows)
    const emails = mapAtEmails(emailRows)
    const statusNote = asString(record?.status_note ?? record?.incident_reason) || null
    const incidentAt = asString(record?.incident_at) || null
    const status = asString(record?.status ?? record?.estado) || null

    const contratoId = asUuid(body.contrato_id ?? body.contratoId)
    if (contratoId) {
      const { error } = await admin
        .from('contratos_equipo')
        .update({
          at_status_note: statusNote,
          at_incident_at: incidentAt,
          at_notes: notes,
          at_events: events,
          at_documents: documents,
          at_emails: emails,
          at_status: status,
        })
        .eq('id', contratoId)
        .eq('source', 'at')
      if (
        error &&
        !/at_notes|at_status_note|at_incident_at|at_events|at_documents|at_emails/.test(error.message)
      ) {
        console.warn('[at-contract-notes] persist failed', error.message)
      }
    }

    return json(request, {
      ok: true,
      at_contract_id: atContractId,
      status,
      status_note: statusNote,
      incident_at: incidentAt,
      notes,
      events,
      documents,
      emails,
    })
  } catch (error) {
    console.error('[at-contract-notes]', error)
    return json(
      request,
      { error: error instanceof Error ? error.message : 'at-contract-notes failed' },
      500
    )
  }
})
