import type { Rating } from './schema.ts'

export type Level = 1 | 2 | 3

export const RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly Rating[]
export const LEVELS = [1, 2, 3] as const satisfies readonly Level[]

/**
 * Nivå per celle i risikomatrisen (spec K10), lest av referansebildet.
 * Ytre nøkkel er sannsynlighet, indre er konsekvens. Tabellen gjelder både
 * trusler og muligheter.
 *
 * Følger score-grensene 1–4 / 5–12 / 15–25 med ett tilsiktet unntak:
 * sannsynlighet 1 og konsekvens 4 er nivå 2.
 */
export const LEVEL_MATRIX: Record<Rating, Record<Rating, Level>> = {
  5: { 1: 2, 2: 2, 3: 3, 4: 3, 5: 3 },
  4: { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3 },
  3: { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3 },
  2: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2 },
  1: { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2 },
}

/** Risikoscore: sannsynlighet × konsekvens. Brukes til sortering. */
export function score(likelihood: Rating, consequence: Rating): number {
  return likelihood * consequence
}

/** Nivå for en risiko, slått opp i matrisen. */
export function level(likelihood: Rating, consequence: Rating): Level {
  return LEVEL_MATRIX[likelihood][consequence]
}
