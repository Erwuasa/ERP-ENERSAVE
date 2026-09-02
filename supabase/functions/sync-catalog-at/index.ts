import { exploreAtList } from '../_shared/at-api.ts'
import { serveAtSyncFunction } from '../_shared/at-sync-http.ts'
import { runCatalogSync } from '../_shared/sync-catalog.ts'

serveAtSyncFunction({
  logName: 'sync-catalog-at',
  eventPrefix: 'catalog.',
  explorePath: '/catalog/enums',
  exploreLabel: '/v1/catalog/enums',
  syncPurpose: 'Sync catálogos AT /v1/catalog/* → public.at_catalog_entries',
  notas: ['No toca tariffs ni marco_retributivo.'],
  runSync: runCatalogSync,
  extraExplore: async () => {
    const paths = [
      '/catalog/billing-companies',
      '/catalog/providers',
      '/catalog/commission-types',
      '/catalog/regulatory',
    ]
    const extra: Record<string, unknown> = {}
    for (const path of paths) {
      try {
        extra[path] = await exploreAtList(path, 2)
      } catch (error) {
        extra[path] = { error: error instanceof Error ? error.message : 'failed' }
      }
    }
    return { catalog_samples: extra }
  },
})
