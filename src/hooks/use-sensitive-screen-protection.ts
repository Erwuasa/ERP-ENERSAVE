import { useEffect, useState } from "react"

/**
 * Medidas disuasorias para pantallas con datos sensibles. NO son garantía de
 * seguridad: capturas, scraping externo o herramientas del SO pueden saltarse
 * cualquier barrera del navegador. La protección real es control de acceso en
 * servidor + auditoría de logs, no bloqueos en el cliente.
 */

export const SENSITIVE_SCREEN_ROOT_ID = "sensitive-screen-root"

const DEVTOOLS_EDGE_THRESHOLD_PX = 160
const DEVTOOLS_SUSTAINED_MS = 1200
const DEVTOOLS_POLL_MS = 400

function isDevToolsLikelyOpen(): boolean {
  const widthGap = window.outerWidth - window.innerWidth
  const heightGap = window.outerHeight - window.innerHeight
  return widthGap > DEVTOOLS_EDGE_THRESHOLD_PX || heightGap > DEVTOOLS_EDGE_THRESHOLD_PX
}

export function useSensitiveScreenContextMenu(rootId = SENSITIVE_SCREEN_ROOT_ID): void {
  useEffect(() => {
    const handler = (event: MouseEvent) => event.preventDefault()
    const el = document.getElementById(rootId)
    el?.addEventListener("contextmenu", handler)
    return () => el?.removeEventListener("contextmenu", handler)
  }, [rootId])
}

export function useDevToolsConfidentialityNotice(): boolean {
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    let sustainedSince: number | null = null

    const tick = () => {
      if (isDevToolsLikelyOpen()) {
        if (sustainedSince === null) sustainedSince = Date.now()
        else if (Date.now() - sustainedSince >= DEVTOOLS_SUSTAINED_MS) setShowNotice(true)
      } else {
        sustainedSince = null
        setShowNotice(false)
      }
    }

    tick()
    const intervalId = window.setInterval(tick, DEVTOOLS_POLL_MS)
    return () => window.clearInterval(intervalId)
  }, [])

  return showNotice
}
