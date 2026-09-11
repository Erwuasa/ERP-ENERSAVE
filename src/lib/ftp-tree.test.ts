import { describe, expect, it } from "vitest"
import { collectFtpDescendantIds, getFtpChildren, sortFtpNodes } from "./ftp-tree"
import type { FtpNode } from "../types/ftp"

function node(id: string, parentId: string | null, nodeType: FtpNode["nodeType"] = "file"): FtpNode {
  return {
    id,
    parentId,
    name: id,
    nodeType,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }
}

describe("collectFtpDescendantIds", () => {
  it("includes the root id even for a leaf file", () => {
    const nodes = [node("file-1", "folder-1")]
    expect(collectFtpDescendantIds(nodes, "file-1")).toEqual(new Set(["file-1"]))
  })

  it("collects direct children of a folder", () => {
    const nodes = [
      node("folder-1", null, "folder"),
      node("file-1", "folder-1"),
      node("file-2", "folder-1"),
    ]
    expect(collectFtpDescendantIds(nodes, "folder-1")).toEqual(
      new Set(["folder-1", "file-1", "file-2"])
    )
  })

  it("recurses through nested subfolders", () => {
    const nodes = [
      node("root", null, "folder"),
      node("sub", "root", "folder"),
      node("deep-file", "sub"),
      node("root-file", "root"),
      node("unrelated", null, "folder"),
      node("unrelated-file", "unrelated"),
    ]
    expect(collectFtpDescendantIds(nodes, "root")).toEqual(
      new Set(["root", "sub", "deep-file", "root-file"])
    )
  })
})

describe("getFtpChildren / sortFtpNodes", () => {
  it("sorts folders before files, then alphabetically", () => {
    const nodes = [
      node("z-file", "p", "file"),
      node("a-folder", "p", "folder"),
      node("a-file", "p", "file"),
    ]
    const sorted = sortFtpNodes(getFtpChildren(nodes, "p"))
    expect(sorted.map((n) => n.id)).toEqual(["a-folder", "a-file", "z-file"])
  })
})
