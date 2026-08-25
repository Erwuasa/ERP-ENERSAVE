import { FtpPanel } from "@/components/FtpPanel"
import { useAuth } from "@/hooks/useAuth"
import { canEditFtp } from "@/lib/ftp-permissions"

export function FtpPage() {
  const { activeUser } = useAuth()
  return <FtpPanel canEdit={canEditFtp(activeUser.role)} activeUserId={activeUser.id} />
}
