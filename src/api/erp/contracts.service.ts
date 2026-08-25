import { saveTeamContractToSupabase } from "@/lib/supabase/contracts"

export {
  buildTeamContractRow,
  saveTeamContractToSupabase,
  type SaveTeamContractResult,
  type TeamContractInsert,
} from "@/lib/supabase/contracts"

export const contractsService = {
  save: saveTeamContractToSupabase,
}
