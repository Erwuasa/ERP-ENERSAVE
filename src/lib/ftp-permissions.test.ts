import { describe, expect, it } from "vitest"
import { buildSeedFtpNodes } from "../data/ftp-seed-catalog"
import { buildFtpBreadcrumb, getFtpChildren } from "./ftp-tree"
import { canEditFtp } from "./ftp-permissions"
import { FTP_LOCAL_ROOT_ID, canMutateFtpLocation, virtualFtpRoots } from "./ftp-sources"

describe("canEditFtp", () => {
  it("allows superadmin and tramitacion only", () => {
    expect(canEditFtp("superadmin")).toBe(true)
    expect(canEditFtp("tramitacion")).toBe(true)
    expect(canEditFtp("comercial")).toBe(false)
    expect(canEditFtp("jefe_comercial")).toBe(false)
  })
})

describe("ftp-tree", () => {
  it("lists operations folder at root and company folders inside", () => {
    const nodes = buildSeedFtpNodes()
    const rootChildren = getFtpChildren(nodes, null)
    expect(rootChildren).toHaveLength(1)
    expect(rootChildren[0]?.name).toBe("DOCUMENTOS OPERACIONES")

    const opsId = rootChildren[0]?.id
    const companyFolders = getFtpChildren(nodes, opsId ?? null)
    expect(companyFolders).toHaveLength(20)
    expect(companyFolders.some((f) => f.name === "REPSOL")).toBe(true)
  })

  it("builds breadcrumb from root to nested folder", () => {
    const nodes = buildSeedFtpNodes()
    const repsol = nodes.find((n) => n.name === "REPSOL")
    const crumbs = buildFtpBreadcrumb(nodes, repsol?.id ?? null)
    expect(crumbs.map((c) => c.label)).toEqual([
      "FTP común",
      "FTP EnerSave",
      "DOCUMENTOS OPERACIONES",
      "REPSOL",
    ])
  })
})

describe("ftp dual sources", () => {
  it("does not allow mutations on the virtual root", () => {
    expect(canMutateFtpLocation(null)).toBe(false)
    expect(canMutateFtpLocation(FTP_LOCAL_ROOT_ID)).toBe(false)
    expect(canMutateFtpLocation("uuid-carpeta-local")).toBe(true)
  })

  it("exposes EnerSave as the only explorer root (AT archive retired)", () => {
    const roots = virtualFtpRoots()
    expect(roots.map((n) => n.name)).toEqual(["FTP EnerSave"])
  })
})
