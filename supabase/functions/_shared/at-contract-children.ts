import { asString, type JsonRecord } from './at-api.ts'

function pickString(row: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(row[key])
    if (value) return value
  }
  return ''
}

export function mapAtNotes(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    note: asString(row.note ?? row.text ?? row.body),
    is_private: row.is_private === true,
    created_at: asString(row.created_at ?? row.createdAt) || null,
    created_by: asString(row.created_by ?? row.createdBy) || null,
    author_side: asString(row.author_side ?? row.authorSide) || null,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
  }))
}

export function mapAtEvents(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    type: pickString(row, ['type', 'event', 'kind', 'action', 'name']),
    title: pickString(row, ['title', 'summary', 'message', 'description', 'label']),
    from_status: pickString(row, ['from', 'from_status', 'old_status', 'status_from', 'previous_status']),
    to_status: pickString(row, ['to', 'to_status', 'new_status', 'status_to']),
    actor: pickString(row, ['actor', 'actor_name', 'user', 'user_name', 'created_by', 'author', 'author_name']),
    created_at: pickString(row, ['created_at', 'createdAt', 'occurred_at', 'timestamp']),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
  }))
}

export function mapAtDocuments(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    name: pickString(row, ['name', 'filename', 'file_name', 'title', 'original_name']),
    type: pickString(row, ['type', 'kind', 'category', 'document_type']),
    url: pickString(row, ['url', 'signed_url', 'download_url', 'file_url', 'public_url']),
    size: pickString(row, ['size', 'file_size', 'bytes']),
    mime: pickString(row, ['mime', 'mime_type', 'content_type']),
    created_at: pickString(row, ['created_at', 'createdAt', 'uploaded_at']),
  }))
}

export function mapAtEmails(rows: JsonRecord[]) {
  return rows.map((row) => ({
    id: asString(row.id) || null,
    subject: pickString(row, ['subject', 'title', 'asunto']),
    to: pickString(row, ['to', 'recipient', 'email', 'to_email']),
    status: pickString(row, ['status', 'delivery_status', 'state']),
    created_at: pickString(row, ['created_at', 'createdAt', 'sent_at']),
  }))
}
