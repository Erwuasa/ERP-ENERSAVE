import { useCallback, useEffect, useState } from "react"
import { AppUpdateBanner } from "@/components/AppUpdateBanner"
import { AvisosModal } from "@/components/AvisosModal"
import { RuntimeIntegrityBlockModal } from "@/components/RuntimeIntegrityBlockModal"
import { useAppVersionCheck } from "@/hooks/use-app-version-check"
import { useRuntimeIntegrityGuard } from "@/hooks/use-runtime-integrity-guard"
import { useAuth } from "@/hooks/useAuth"
import { createIncidencia } from "@/lib/supabase/incidencias"
import { isRuntimeIntegrityEnforced } from "@/lib/runtime-integrity-env"
import { isRuntimeIntegrityBlockExempt } from "@/lib/runtime-integrity-exempt"
import { recordRuntimeIntegrityBlock } from "@/lib/supabase/runtime-integrity-blocks"
import {
  buildSecurityIncidencia,
  securityIncidenciaFingerprint,
} from "@/lib/runtime-integrity-incident"
import type { IntegrityFinding } from "@/lib/runtime-integrity"
import { useIncidenciasContext } from "@/pages/erp/incidencias/IncidenciasProvider"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"

export function WorkspaceChrome() {
  const { activeUser, activeUserId, isLoggedIn } = useAuth()
  const { incidencias, setIncidencias } = useIncidenciasContext()
  const { unviewedAvisos, markAvisosVistos } = useStaffFeeds()
  const { remoteVersion, dismiss } = useAppVersionCheck()
  const [avisosModalOpen, setAvisosModalOpen] = useState(false)
  const [reportedFingerprint, setReportedFingerprint] = useState<string | null>(null)

  useEffect(() => {
    if (isLoggedIn && unviewedAvisos.length > 0) setAvisosModalOpen(true)
  }, [isLoggedIn, unviewedAvisos.length])

  const onBlocked = useCallback(
    (findings: IntegrityFinding[]) => {
      if (
        isRuntimeIntegrityBlockExempt({
          role: activeUser.role,
          integrityGuardBypass: activeUser.integrityGuardBypass,
        })
      ) {
        return
      }

      const fingerprint = securityIncidenciaFingerprint(findings)
      if (fingerprint === reportedFingerprint) return
      setReportedFingerprint(fingerprint)
      void recordRuntimeIntegrityBlock(findings, fingerprint)
      const ticket = buildSecurityIncidencia({
        userId: activeUserId,
        userName: activeUser.fullName,
        findings,
        existingIncidencias: incidencias,
      })
      setIncidencias((prev) => [ticket, ...prev])
      void createIncidencia(ticket)
    },
    [
      activeUser.fullName,
      activeUser.integrityGuardBypass,
      activeUser.role,
      activeUserId,
      incidencias,
      reportedFingerprint,
      setIncidencias,
    ]
  )

  const integrityGuardExempt = isRuntimeIntegrityBlockExempt({
    role: activeUser.role,
    integrityGuardBypass: activeUser.integrityGuardBypass,
  })

  const { blocked, findings } = useRuntimeIntegrityGuard({
    enabled: isLoggedIn && isRuntimeIntegrityEnforced(),
    exemptFromBlock: integrityGuardExempt,
    onBlocked,
  })

  return (
    <>
      {remoteVersion ? (
        <AppUpdateBanner remoteVersion={remoteVersion} onDismiss={dismiss} />
      ) : null}
      {blocked ? (
        <RuntimeIntegrityBlockModal userName={activeUser.fullName} findings={findings} />
      ) : null}
      <AvisosModal
        open={avisosModalOpen}
        avisos={unviewedAvisos}
        activeUserId={activeUserId}
        onClose={() => setAvisosModalOpen(false)}
        onMarcarVistos={() => markAvisosVistos()}
      />
    </>
  )
}
