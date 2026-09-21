import { describe, expect, it } from "vitest"
import { STAFF_INVITE_APP_ORIGIN, STAFF_INVITE_LOGIN_URL, buildStaffInviteLoginHref } from "./staff-invite-app-url"

describe("staff invite login URL", () => {
  it("siempre apunta a la app de producción, no a localhost", () => {
    expect(STAFF_INVITE_APP_ORIGIN).toBe("https://erp-enersave.vercel.app")
    expect(STAFF_INVITE_LOGIN_URL).toBe("https://erp-enersave.vercel.app/login")
    expect(STAFF_INVITE_LOGIN_URL).not.toMatch(/localhost|erp\.enersave\.es/)
  })

  it("incluye el email para prefijar el primer acceso", () => {
    const href = buildStaffInviteLoginHref("Yerman@Mail.com")
    expect(href.startsWith("https://erp-enersave.vercel.app/?")).toBe(true)
    expect(href).toContain("invite=1")
    expect(href).toContain("email=yerman%40mail.com")
  })
})
