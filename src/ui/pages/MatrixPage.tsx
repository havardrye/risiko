import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { filterRisks } from '../../domain/filters.ts'
import { buildMatrix, type MatrixCell } from '../../domain/matrix.ts'
import {
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
  RISK_TYPE_LABELS,
  RISK_TYPES,
} from '../../domain/scales.ts'
import { LEVELS } from '../../domain/scoring.ts'
import { useAppData } from '../../state/dataContext.ts'
import { LevelBadge } from '../components/LevelBadge.tsx'
import { RiskFilterBar } from '../components/RiskFilterBar.tsx'
import { RiskMatrix } from '../components/RiskMatrix.tsx'
import { countText } from '../matrixLabels.ts'
import { OPEN_RISK_PARAM, ROUTES } from '../routes.ts'
import { usePageTitle } from '../usePageTitle.ts'
import { filterSearch, useRiskFilter } from '../useRiskFilter.ts'
import styles from './MatrixPage.module.css'

type CellKey = Pick<MatrixCell, 'type' | 'likelihood' | 'consequence'>

export function MatrixPage() {
  usePageTitle(ROUTES.matrix.label)
  const { risks, owners } = useAppData()
  const location = useLocation()
  const filterState = useRiskFilter()
  const [selected, setSelected] = useState<CellKey>()

  const filtered = useMemo(
    () => filterRisks(risks, filterState.filter),
    [risks, filterState.filter],
  )

  // Den valgte cellen slås opp på nytt, slik at listen følger filtre og endringer.
  const selectedCell = useMemo(() => {
    if (!selected) return undefined
    return buildMatrix(filtered)
      .flatMap((row) => row.cells)
      .find(
        (cell) =>
          cell.type === selected.type &&
          cell.likelihood === selected.likelihood &&
          cell.consequence === selected.consequence,
      )
  }, [filtered, selected])

  const ownerNames = useMemo(() => new Map(owners.map((o) => [o.id, o.name])), [owners])

  function selectCell(cell: MatrixCell) {
    const same =
      selected?.type === cell.type &&
      selected.likelihood === cell.likelihood &&
      selected.consequence === cell.consequence
    setSelected(
      same
        ? undefined
        : { type: cell.type, likelihood: cell.likelihood, consequence: cell.consequence },
    )
  }

  /** Lenke til registeret som åpner risikoen, med de samme filtrene. */
  function riskLink(id: string): string {
    const params = new URLSearchParams(filterSearch(location.search))
    params.set(OPEN_RISK_PARAM, id)
    return `${ROUTES.risks.path}?${params.toString()}`
  }

  return (
    <>
      <h1>{ROUTES.matrix.label}</h1>
      <p className="muted">
        Tallet i hver celle er antall risikoer med den sannsynligheten og konsekvensen.
        Muligheter står til venstre og trusler til høyre. Velg en celle for å se risikoene i den.
      </p>

      {risks.length === 0 ? (
        <p className={styles.notice}>
          Ingen risikoer er registrert ennå. Registrer dem i{' '}
          <Link to={ROUTES.risks.path}>risikoregisteret</Link>.
        </p>
      ) : (
        <>
          <RiskFilterBar state={filterState} />
          <p className="muted" aria-live="polite">
            {filterState.active
              ? `Viser ${filtered.length} av ${countText(risks.length)}`
              : `${countText(risks.length)} i matrisen`}
          </p>
        </>
      )}

      <RiskMatrix risks={filtered} onSelectCell={selectCell} selected={selected} />

      {selectedCell && (
        <section className={styles.details} aria-labelledby="valgt-celle">
          <div className={styles.detailsHeader}>
            <h2 id="valgt-celle" className={styles.detailsTitle}>
              {RISK_TYPE_LABELS[selectedCell.type]}: sannsynlighet {selectedCell.likelihood}{' '}
              {LIKELIHOOD_LABELS[selectedCell.likelihood].toLowerCase()}, konsekvens{' '}
              {selectedCell.consequence}{' '}
              {CONSEQUENCE_LABELS[selectedCell.type][selectedCell.consequence].toLowerCase()}
            </h2>
            <LevelBadge type={selectedCell.type} level={selectedCell.level} />
            <button
              type="button"
              className={`button button-small ${styles.close}`}
              onClick={() => setSelected(undefined)}
            >
              Lukk
            </button>
          </div>
          {selectedCell.risks.length === 0 ? (
            <p className="muted">Ingen risikoer i denne cellen med gjeldende filtre.</p>
          ) : (
            <ul className={styles.riskList}>
              {selectedCell.risks.map((risk) => (
                <li key={risk.id}>
                  <Link to={riskLink(risk.id)}>{risk.title}</Link>
                  <span className="muted"> · {ownerNames.get(risk.ownerId)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <dl className={styles.legend} aria-label="Fargeforklaring">
        {RISK_TYPES.map((type) => (
          <div key={type} className={styles.legendGroup}>
            <dt>{RISK_TYPE_LABELS[type]}</dt>
            {LEVELS.map((level) => (
              <dd key={level}>
                <LevelBadge type={type} level={level} />
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </>
  )
}
