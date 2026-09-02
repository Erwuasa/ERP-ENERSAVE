import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runLiquidationSync } from '../_shared/sync-liquidations.ts'

serveAtSyncFunction({
  logName: 'sync-liquidations-at',
  eventPrefix: 'liquidation.',
  explorePath: '/liquidations',
  exploreLabel: '/v1/liquidations',
  syncPurpose: 'Sync liquidaciones AT Enterprise → public.settlements',
  notas: [
    'Las liquidaciones mensuales ERP (source=manual) no se tocan.',
    'company_payment_status y collaborator_payment_status se guardan aparte.',
  ],
  runSync: runLiquidationSync,
})
