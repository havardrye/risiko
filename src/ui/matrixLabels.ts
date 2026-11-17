import type { MatrixCell } from '../domain/matrix.ts'
import {
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
  levelStyle,
  RISK_TYPE_LABELS,
} from '../domain/scales.ts'

export function countText(count: number): string {
  return count === 1 ? '1 risiko' : `${count} risikoer`
}

/**
 * Fullt navn på en celle i matrisen, for skjermlesere og som overskrift når
 * cellen er valgt. F.eks. «Trussel, sannsynlighet 4 Høy, konsekvens 5 Svært
 * alvorlig, nivå Høy, 3 risikoer».
 */
export function cellLabel(cell: MatrixCell): string {
  return [
    RISK_TYPE_LABELS[cell.type],
    `sannsynlighet ${cell.likelihood} ${LIKELIHOOD_LABELS[cell.likelihood]}`,
    `konsekvens ${cell.consequence} ${CONSEQUENCE_LABELS[cell.type][cell.consequence]}`,
    `nivå ${levelStyle(cell.type, cell.level).name}`,
    countText(cell.risks.length),
  ].join(', ')
}
