/** Versión embebida en el bundle actual (se inyecta en build desde app.version.json). */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION as string
export const APP_PRODUCT_NAME = import.meta.env.VITE_APP_PRODUCT_NAME as string

export function formatAppVersionLabel(version = APP_VERSION): string {
  return `${APP_PRODUCT_NAME} v${version}`
}
