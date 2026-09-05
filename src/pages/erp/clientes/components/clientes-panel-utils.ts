import type { ClienteArchivo } from "@/types/client"

export const CLIENTES_TH =
  "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-nowrap"

export const CLIENTES_TD = "px-2.5 py-2.5 align-middle border-b border-brand-border/70"

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function downloadClienteArchivo(archivo: ClienteArchivo) {
  const link = document.createElement("a")
  link.href = archivo.dataUrl
  link.download = archivo.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function buildClientesCsv(
  rows: string[][],
  headers: string[]
): string {
  return [
    headers.join(","),
    ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")),
  ].join("\n")
}

export interface ClientesProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}
