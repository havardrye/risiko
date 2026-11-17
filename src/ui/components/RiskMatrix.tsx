import { useMemo } from 'react'
import { buildMatrix, MATRIX_COLUMNS, type MatrixCell } from '../../domain/matrix.ts'
import {
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
  levelStyle,
  RISK_TYPE_LABELS,
} from '../../domain/scales.ts'
import type { Risk } from '../../domain/schema.ts'
import { cellLabel } from '../matrixLabels.ts'
import styles from './RiskMatrix.module.css'

interface RiskMatrixProps {
  risks: readonly Risk[]
  /** Kalles når brukeren velger en celle med risikoer. Uten denne er cellene bare til visning. */
  onSelectCell?: (cell: MatrixCell) => void
  /** Cellen som er valgt, slik at den kan markeres. */
  selected?: Pick<MatrixCell, 'type' | 'likelihood' | 'consequence'> | undefined
}

function isSame(
  cell: MatrixCell,
  other: Pick<MatrixCell, 'type' | 'likelihood' | 'consequence'> | undefined,
): boolean {
  return (
    other !== undefined &&
    cell.type === other.type &&
    cell.likelihood === other.likelihood &&
    cell.consequence === other.consequence
  )
}

/**
 * Risikomatrisen (spec K6, K7), utformet etter referansebildet:
 * sannsynlighet på rader med 5 øverst, muligheter til venstre med
 * konsekvens 5→1 og trusler til høyre med konsekvens 1→5.
 */
export function RiskMatrix({ risks, onSelectCell, selected }: RiskMatrixProps) {
  const rows = useMemo(() => buildMatrix(risks), [risks])

  return (
    <div className={styles.scroll}>
      <table className={styles.matrix}>
        <caption className="visually-hidden">
          Risikomatrise. Rader er sannsynlighet fra 5 til 1. Kolonnene til venstre er muligheter
          med konsekvens fra 5 til 1, kolonnene til høyre er trusler med konsekvens fra 1 til 5.
        </caption>
        <colgroup>
          <col className={styles.headerCol} />
        </colgroup>
        <colgroup span={5} />
        <colgroup span={5} />
        <tbody>
          {rows.map((row) => (
            <tr key={row.likelihood}>
              <th scope="row" className={styles.rowHeader}>
                <span className={styles.number}>{row.likelihood}</span>{' '}
                <span>{LIKELIHOOD_LABELS[row.likelihood]}</span>
              </th>
              {row.cells.map((cell) => {
                const style = levelStyle(cell.type, cell.level)
                const count = cell.risks.length
                const className = [
                  styles.cell,
                  cell.type === 'threat' && cell.consequence === 1 ? styles.divider : '',
                  isSame(cell, selected) ? styles.selected : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                const content = (
                  <>
                    <span aria-hidden="true" className={styles.count}>
                      {count > 0 ? count : ''}
                    </span>
                    <span className="visually-hidden">{cellLabel(cell)}</span>
                  </>
                )
                return (
                  <td
                    key={`${cell.type}-${cell.consequence}`}
                    className={className}
                    style={{ background: style.background, color: style.text }}
                  >
                    {/* Bare celler med risikoer kan velges, så tastaturbrukere slipper 50 stopp. */}
                    {onSelectCell && count > 0 ? (
                      <button
                        type="button"
                        className={styles.cellButton}
                        aria-pressed={isSame(cell, selected)}
                        onClick={() => onSelectCell(cell)}
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={styles.corner} />
            {MATRIX_COLUMNS.map((column) => (
              <th
                key={`${column.type}-${column.consequence}`}
                scope="col"
                className={[
                  styles.colHeader,
                  column.type === 'threat' && column.consequence === 1 ? styles.divider : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.number}>{column.consequence}</span>{' '}
                <span>{CONSEQUENCE_LABELS[column.type][column.consequence]}</span>
              </th>
            ))}
          </tr>
          <tr>
            <td className={styles.corner} />
            <th scope="colgroup" colSpan={5} className={`${styles.group} ${styles.opportunity}`}>
              {RISK_TYPE_LABELS.opportunity}
            </th>
            <th scope="colgroup" colSpan={5} className={`${styles.group} ${styles.threat}`}>
              {RISK_TYPE_LABELS.threat}
            </th>
          </tr>
          <tr aria-hidden="true">
            <td className={styles.corner} />
            <td colSpan={10} className={styles.axis}>
              Konsekvens
            </td>
          </tr>
        </tfoot>
      </table>
      <p className={styles.yAxis} aria-hidden="true">
        Sannsynlighet ↑
      </p>
    </div>
  )
}
