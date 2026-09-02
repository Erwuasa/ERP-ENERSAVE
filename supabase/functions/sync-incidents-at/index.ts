import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runIncidentSync } from '../_shared/sync-incidents.ts'

serveAtSyncFunction({
  logName: 'sync-incidents-at',
  eventPrefix: 'incident.',
  explorePath: '/incidents',
  exploreLabel: '/v1/incidents',
  syncPurpose: 'Sync incidencias AT Enterprise → public.incidencias',
  notas: ['origen=sistema. El contrato se enlaza por at_contract_id si ya está sincronizado.'],
  runSync: runIncidentSync,
})
