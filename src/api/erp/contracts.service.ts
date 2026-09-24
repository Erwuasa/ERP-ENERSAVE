import { saveTeamContractToSupabase } from "@/lib/supabase/contracts"

export {
  buildTeamContractRow,
  saveTeamContractToSupabase,
  type SaveTeamContractResult,
  type TeamContractInsert,
} from "@/lib/supabase/contracts"

export const contractsService = {
  save: (
    contract: Parameters<typeof saveTeamContractToSupabase>[0],
    form: Parameters<typeof saveTeamContractToSupabase>[1],
    sellerProfile?: Parameters<typeof saveTeamContractToSupabase>[2]
  ) => saveTeamContractToSupabase(contract, form, sellerProfile),
}
