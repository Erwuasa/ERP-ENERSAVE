import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runComparisonSync } from '../_shared/sync-comparisons.ts'

serveAtSyncFunction({
  logName: 'sync-comparisons-at',
  eventPrefix: 'comparison.',
  explorePath: '/comparisons',
  exploreLabel: '/v1/comparisons',
  syncPurpose: 'Sync comparativas AT Enterprise → public.at_comparisons',
  notas: ['El comparador local del ERP no se sustituye; esto persiste el historial AT.'],
  runSync: runComparisonSync,
})
