import type { Rating, Risk, RiskType } from './schema.ts'
import { level, type Level } from './scoring.ts'

/** Oppbygging av risikomatrisen (spec K6): 5 rader × 10 kolonner. */

export interface MatrixColumn {
  type: RiskType
  consequence: Rating
}

export interface MatrixCell extends MatrixColumn {
  likelihood: Rating
  level: Level
  risks: Risk[]
}

export interface MatrixRow {
  likelihood: Rating
  cells: MatrixCell[]
}

/** Rader ovenfra og ned: høyest sannsynlighet øverst. */
export const MATRIX_LIKELIHOODS: readonly Rating[] = [5, 4, 3, 2, 1]

/**
 * Kolonner fra venstre mot høyre: muligheter med konsekvens 5→1, deretter
 * trusler med konsekvens 1→5. De mest betydningsfulle cellene ligger ytterst.
 */
export const MATRIX_COLUMNS: readonly MatrixColumn[] = [
  { type: 'opportunity', consequence: 5 },
  { type: 'opportunity', consequence: 4 },
  { type: 'opportunity', consequence: 3 },
  { type: 'opportunity', consequence: 2 },
  { type: 'opportunity', consequence: 1 },
  { type: 'threat', consequence: 1 },
  { type: 'threat', consequence: 2 },
  { type: 'threat', consequence: 3 },
  { type: 'threat', consequence: 4 },
  { type: 'threat', consequence: 5 },
]

function cellKey(type: RiskType, likelihood: Rating, consequence: Rating): string {
  return `${type}:${likelihood}:${consequence}`
}

/** Plasserer risikoene i matrisen. Risikoene i en celle beholder rekkefølgen de kom inn i. */
export function buildMatrix(risks: readonly Risk[]): MatrixRow[] {
  const byCell = new Map<string, Risk[]>()
  for (const risk of risks) {
    const key = cellKey(risk.type, risk.likelihood, risk.consequence)
    const list = byCell.get(key)
    if (list) list.push(risk)
    else byCell.set(key, [risk])
  }

  return MATRIX_LIKELIHOODS.map((likelihood) => ({
    likelihood,
    cells: MATRIX_COLUMNS.map(({ type, consequence }) => ({
      type,
      likelihood,
      consequence,
      level: level(likelihood, consequence),
      risks: byCell.get(cellKey(type, likelihood, consequence)) ?? [],
    })),
  }))
}
