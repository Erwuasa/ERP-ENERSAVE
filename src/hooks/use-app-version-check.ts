import { useCallback, useEffect, useState } from 'react'
import { APP_VERSION } from '../lib/app-version'
import { dismissAppVersion, isRemoteVersionNewer, isVersionDismissed } from '../lib/app-update'

const CHECK_INTERVAL_MS = 5 * 60 * 1000

interface RemoteVersionManifest {
  version: string
  productName?: string
}

export function useAppVersionCheck() {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const checkForUpdate = useCallback(async () => {
    if (import.meta.env.DEV) return

    try {
      const response = await fetch(`/app-version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) return

      const data = (await response.json()) as RemoteVersionManifest
      if (!data.version || !isRemoteVersionNewer(data.version, APP_VERSION)) return
      if (isVersionDismissed(data.version)) return

      setRemoteVersion(data.version)
      setDismissed(false)
    } catch {
      // Red intermitente: reintentar en el siguiente intervalo
    }
  }, [])

  useEffect(() => {
    void checkForUpdate()
    const intervalId = window.setInterval(() => {
      void checkForUpdate()
    }, CHECK_INTERVAL_MS)

    function handleFocus() {
      void checkForUpdate()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkForUpdate])

  const dismiss = useCallback(() => {
    if (!remoteVersion) return
    dismissAppVersion(remoteVersion)
    setDismissed(true)
  }, [remoteVersion])

  return {
    remoteVersion: dismissed ? null : remoteVersion,
    dismiss,
  }
}
