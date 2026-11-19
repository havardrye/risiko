import type { AppData } from '../domain/schema.ts'
import { ROUTES } from './routes.ts'

export interface SetupStep {
  /** F.eks. «opprett minst ett risikotema under». Avsluttes med sidenavnet som lenke. */
  text: string
  route: { path: string; label: string }
}

/**
 * Hva en ny bruker bør gjøre som neste steg for å komme fram til første
 * risiko (spec K22): eier, tema og område må finnes før en risiko kan
 * registreres. Område kommer før tema, fordi et tema hører til et område
 * (spec 006). `undefined` når minst én risiko er registrert.
 */
export function nextSetupStep(data: AppData): SetupStep | undefined {
  if (data.owners.length === 0) {
    return { text: 'opprett minst én risikoeier under', route: ROUTES.owners }
  }
  if (data.areas.length === 0) {
    return { text: 'opprett minst ett risikoområde under', route: ROUTES.areas }
  }
  if (data.themes.length === 0) {
    return { text: 'opprett minst ett risikotema under', route: ROUTES.themes }
  }
  if (data.risks.length === 0) {
    return { text: 'registrer den første risikoen i', route: ROUTES.risks }
  }
  return undefined
}
