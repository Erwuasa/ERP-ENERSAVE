import axpoLogo from "../../assets/logos/comercializadoras/axpo.webp"
import edpLogo from "../../assets/logos/comercializadoras/edp.webp"
import endesaLogo from "../../assets/logos/comercializadoras/endesa.webp"
import ganaEnergiaLogo from "../../assets/logos/comercializadoras/gana-energia.webp"
import holaluzLogo from "../../assets/logos/comercializadoras/holaluz.webp"
import iberdrolaLogo from "../../assets/logos/comercializadoras/iberdrola.webp"
import ignisLogo from "../../assets/logos/comercializadoras/ignis.webp"
import naturgyLogo from "../../assets/logos/comercializadoras/naturgy.webp"
import nibaLogo from "../../assets/logos/comercializadoras/niba.webp"
import octopusLogo from "../../assets/logos/comercializadoras/octopus.webp"
import repsolLogo from "../../assets/logos/comercializadoras/repsol.webp"
import totalenergiesLogo from "../../assets/logos/comercializadoras/totalenergies.webp"
import unielectricaLogo from "../../assets/logos/comercializadoras/unielectrica.webp"
import type { CompaniaLogoKey } from "./compania-logos"

export const COMPANIA_LOGO_SRC: Record<CompaniaLogoKey, string> = {
  endesa: endesaLogo,
  repsol: repsolLogo,
  naturgy: naturgyLogo,
  totalenergies: totalenergiesLogo,
  iberdrola: iberdrolaLogo,
  niba: nibaLogo,
  axpo: axpoLogo,
  ignis: ignisLogo,
  ganaenergia: ganaEnergiaLogo,
  unielectrica: unielectricaLogo,
  edp: edpLogo,
  holaluz: holaluzLogo,
  octopus: octopusLogo,
}
