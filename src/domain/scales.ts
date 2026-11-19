import type { Rating, RiskType } from './schema.ts'
import type { Level } from './scoring.ts'

/** Tekster, nivånavn og farger for skalaene (spec: Skalaer, K7, K10). */

export const RISK_TYPES = ['threat', 'opportunity'] as const satisfies readonly RiskType[]

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  threat: 'Trussel',
  opportunity: 'Mulighet',
}

export const LIKELIHOOD_LABELS: Record<Rating, string> = {
  1: 'Svært lav',
  2: 'Lav',
  3: 'Moderat',
  4: 'Høy',
  5: 'Svært høy',
}

export const CONSEQUENCE_LABELS: Record<RiskType, Record<Rating, string>> = {
  threat: {
    1: 'Ubetydelig',
    2: 'Liten',
    3: 'Moderat',
    4: 'Alvorlig',
    5: 'Svært alvorlig',
  },
  opportunity: {
    1: 'Ubetydelig',
    2: 'Liten',
    3: 'Moderat',
    4: 'Verdifull',
    5: 'Svært verdifull',
  },
}

export interface LevelStyle {
  name: string
  /** Bakgrunnsfarge for cellen eller merket. */
  background: string
  /** Tekstfarge med kontrast på minst 4,5:1 mot bakgrunnen. */
  text: string
}

const DARK_TEXT = '#1a1a1a'
const LIGHT_TEXT = '#ffffff'

/**
 * Fargene følger referansebildet. Rød er gjort litt mørkere enn i bildet,
 * slik at hvit tekst får god nok kontrast.
 */
export const LEVEL_STYLES: Record<RiskType, Record<Level, LevelStyle>> = {
  threat: {
    1: { name: 'Lav', background: '#4ea72e', text: DARK_TEXT },
    2: { name: 'Middels', background: '#ffff00', text: DARK_TEXT },
    3: { name: 'Høy', background: '#d50000', text: LIGHT_TEXT },
  },
  opportunity: {
    1: { name: 'Liten', background: '#dce6f2', text: DARK_TEXT },
    2: { name: 'Middels', background: '#0f9ed5', text: DARK_TEXT },
    3: { name: 'Stor', background: '#215f9a', text: LIGHT_TEXT },
  },
}

/** F.eks. «4 – Høy». */
export function likelihoodLabel(value: Rating): string {
  return `${value} – ${LIKELIHOOD_LABELS[value]}`
}

/** F.eks. «5 – Svært verdifull». */
export function consequenceLabel(type: RiskType, value: Rating): string {
  return `${value} – ${CONSEQUENCE_LABELS[type][value]}`
}

export function levelStyle(type: RiskType, level: Level): LevelStyle {
  return LEVEL_STYLES[type][level]
}
