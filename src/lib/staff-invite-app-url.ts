/** URL pública del ERP (correos de invitación). Nunca usar localhost. */
export const STAFF_INVITE_APP_ORIGIN = "https://erp-enersave.vercel.app"

export const STAFF_INVITE_LOGIN_URL = `${STAFF_INVITE_APP_ORIGIN}/login`

export function buildStaffInviteLoginHref(email: string): string {
  const params = new URLSearchParams({
    invite: "1",
    email: email.trim().toLowerCase(),
  })
  return `${STAFF_INVITE_APP_ORIGIN}/?${params.toString()}`
}
