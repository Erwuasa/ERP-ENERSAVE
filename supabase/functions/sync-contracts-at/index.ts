import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runContractSync } from '../_shared/sync-contracts.ts'

serveAtSyncFunction({
  logName: 'sync-contracts-at',
  eventPrefix: 'contract.',
  explorePath: '/contracts',
  exploreLabel: '/v1/contracts',
  syncPurpose: 'Sync contratos AT Enterprise → public.contratos_equipo',
  notas: [
    'Estados AT se mapean a los estados ERP.',
    'cliente_id / tariff_id / marco se enlazan por at_* ids si existen.',
    'Si el webhook trae id: sync de ese contrato + GET /contracts/{id}/notes.',
    'Campos extra quedan en at_payload y metadata.',
  ],
  runSync: runContractSync,
})
