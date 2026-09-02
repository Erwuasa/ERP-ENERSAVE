import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runEmailSync } from '../_shared/sync-emails.ts'

serveAtSyncFunction({
  logName: 'sync-emails-at',
  eventPrefix: 'email.',
  explorePath: '/emails',
  exploreLabel: '/v1/emails',
  syncPurpose: 'Sync avisos email AT → public.at_email_logs',
  notas: ['No se mezcla con la tabla avisos (banners internos).'],
  runSync: runEmailSync,
})
