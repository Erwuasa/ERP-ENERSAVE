import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runClientSync } from '../_shared/sync-clients.ts'

serveAtSyncFunction({
  logName: 'sync-clients-at',
  eventPrefix: 'client.',
  explorePath: '/clients',
  exploreLabel: '/v1/clients',
  syncPurpose: 'Sync clientes AT Enterprise → public.clientes',
  notas: [
    'source=manual no se sobreescribe; si coincide el NIF se pega at_client_id.',
    'tipo pyme AT se guarda como empresa.',
    'comercial_id de AT no se mapea hasta sync de usuarios.',
  ],
  runSync: runClientSync,
})
