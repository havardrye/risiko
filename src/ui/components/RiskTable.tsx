import { useMemo } from 'react'
import { sortRisks, type RiskSort, type SortKey } from '../../domain/filters.ts'
import { RISK_TYPE_LABELS } from '../../domain/scales.ts'
import type { Id, Risk } from '../../domain/schema.ts'
import { level, score } from '../../domain/scoring.ts'
import { useAppData } from '../../state/dataContext.ts'
import { CodeText } from './CodeText.tsx'
import { LevelBadge } from './LevelBadge.tsx'
import styles from './RiskTable.module.css'

interface RiskTableProps {
  risks: readonly Risk[]
  sort: RiskSort
  onSortChange: (sort: RiskSort) => void
  onEdit: (risk: Risk) => void
  onDelete: (risk: Risk) => void
}

/** Retningen en kolonne sorteres i ved første klikk: høyest og nyest først, tittel A–Å. */
const FIRST_DIRECTION: Record<SortKey, RiskSort['direction']> = {
  code: 'asc',
  score: 'desc',
  updatedAt: 'desc',
  title: 'asc',
}

/** Kolonnens navn i den skjulte tabelltittelen, f.eks. «sortert etter ID». */
const SORT_NAMES: Record<SortKey, string> = {
  code: 'ID',
  score: 'score',
  title: 'tittel',
  updatedAt: 'sist endret',
}

const DATE_FORMAT = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'short' })

function nameLookup(items: readonly { id: Id; name: string }[]): Map<Id, string> {
  return new Map(items.map((item) => [item.id, item.name]))
}

interface SortHeaderProps {
  sort: RiskSort
  onSortChange: (sort: RiskSort) => void
  sortKey: SortKey
  label: string
  numeric?: boolean
}

/** Kolonneoverskrift som sorterer ved klikk. Andre klikk snur retningen. */
function SortHeader({ sort, onSortChange, sortKey, label, numeric = false }: SortHeaderProps) {
  const active = sort.key === sortKey
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
  const next: RiskSort = active
    ? { key: sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
    : { key: sortKey, direction: FIRST_DIRECTION[sortKey] }

  return (
    <th scope="col" aria-sort={ariaSort} className={numeric ? 'numeric' : undefined}>
      <button type="button" className={styles.sortButton} onClick={() => onSortChange(next)}>
        {label}
        <span aria-hidden="true" className={active ? styles.sortActive : styles.sortIdle}>
          {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

/** Risikoregisteret som tabell (spec K3–K5). */
export function RiskTable({ risks, sort, onSortChange, onEdit, onDelete }: RiskTableProps) {
  const { owners, themes, areas } = useAppData()
  const ownerNames = useMemo(() => nameLookup(owners), [owners])
  const themeNames = useMemo(() => nameLookup(themes), [themes])
  const areaNames = useMemo(() => nameLookup(areas), [areas])
  const sorted = useMemo(() => sortRisks(risks, sort), [risks, sort])
  const sortProps = { sort, onSortChange }

  return (
    <div className="table-scroll">
      <table className="table">
        <caption className="visually-hidden">
          Risikoer, sortert etter{' '}
          {SORT_NAMES[sort.key]},{' '}
          {sort.direction === 'asc' ? 'stigende' : 'synkende'}
        </caption>
        <thead>
          <tr>
            <SortHeader {...sortProps} sortKey="code" label="ID" />
            <SortHeader {...sortProps} sortKey="title" label="Tittel" />
            <th scope="col">Type</th>
            <th scope="col">Eier</th>
            <th scope="col">Tema</th>
            <th scope="col">Område</th>
            <SortHeader {...sortProps} sortKey="score" label="Score" numeric />
            <th scope="col">Nivå</th>
            <SortHeader {...sortProps} sortKey="updatedAt" label="Sist endret" />
            <th scope="col">
              <span className="visually-hidden">Handlinger</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((risk) => (
            <tr key={risk.id}>
              <td className="nowrap">
                <CodeText code={risk.code} />
              </td>
              <th scope="row" className={styles.title}>
                {risk.title}
              </th>
              <td>{RISK_TYPE_LABELS[risk.type]}</td>
              <td>{ownerNames.get(risk.ownerId)}</td>
              <td>{themeNames.get(risk.themeId)}</td>
              <td>{areaNames.get(risk.areaId)}</td>
              <td className="numeric nowrap">
                {/* K56: utregningen vises, f.eks. «4x5=20». Skjermlesere får den som ord. */}
                <span aria-hidden="true">
                  {risk.likelihood}x{risk.consequence}={score(risk.likelihood, risk.consequence)}
                </span>
                <span className="visually-hidden">
                  sannsynlighet {risk.likelihood}, konsekvens {risk.consequence}, score{' '}
                  {score(risk.likelihood, risk.consequence)}
                </span>
              </td>
              <td>
                <LevelBadge type={risk.type} level={level(risk.likelihood, risk.consequence)} />
              </td>
              <td className={styles.date}>
                <time dateTime={risk.updatedAt}>{DATE_FORMAT.format(new Date(risk.updatedAt))}</time>
              </td>
              <td className="actions">
                <button
                  type="button"
                  className="button button-small"
                  aria-label={`Endre ${risk.title}`}
                  onClick={() => onEdit(risk)}
                >
                  Endre
                </button>
                <button
                  type="button"
                  className="button button-small"
                  aria-label={`Slett ${risk.title}`}
                  onClick={() => onDelete(risk)}
                >
                  Slett
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
