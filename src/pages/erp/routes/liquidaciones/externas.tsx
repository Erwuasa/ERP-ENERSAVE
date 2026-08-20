import { LiquidacionesExternasPage } from "@/pages/erp/liquidaciones-externas/LiquidacionesExternasPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpLiquidacionesExternasRoute() {
  const ws = useErpWorkspaceContext()
  return <LiquidacionesExternasPage ws={ws} />
}
