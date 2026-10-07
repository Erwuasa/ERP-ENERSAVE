import { entitySyncOptions } from '../_shared/enertech-entities.ts'
import { serveEnertechSync } from '../_shared/enertech-sync-runner.ts'

serveEnertechSync(entitySyncOptions('enertech-sync-clientes'))
