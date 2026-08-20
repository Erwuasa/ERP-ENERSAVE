import type { FormEvent, ReactNode } from "react"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"

export interface WizardProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

export interface NuevoContratoWizardProps {
  open: boolean
  onClose: () => void
  form: NewContractFormState
  onChange: (patch: Partial<NewContractFormState>) => void
  onSubmit: (e: FormEvent, options?: { incomplete?: boolean }) => void
  isSubmitting: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  profiles: WizardProfileOption[]
  activeUserId: string
  activeUserName: string
  activeUserRole: string
  clients: Client[]
  contracts: Contract[]
}
