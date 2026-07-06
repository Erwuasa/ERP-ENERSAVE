import { describe, expect, it } from "vitest"
import { getFilesFromDataTransfer } from "../../components/ui/FileDropZone"

describe("getFilesFromDataTransfer", () => {
  it("returns empty array for null data", () => {
    expect(getFilesFromDataTransfer(null)).toEqual([])
  })

  it("collects files from FileList on data transfer", () => {
    const file = new File(["x"], "test.pdf", { type: "application/pdf" })
    const dt = {
      files: [file],
      items: [],
    } as unknown as DataTransfer
    expect(getFilesFromDataTransfer(dt).map((f) => f.name)).toEqual(["test.pdf"])
  })
})
