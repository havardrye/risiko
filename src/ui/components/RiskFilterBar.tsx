import { useId, useMemo } from 'react'
import { LEVEL_STYLES, RISK_TYPE_LABELS, RISK_TYPES } from '../../domain/scales.ts'
import type { RiskType } from '../../domain/schema.ts'
import { LEVELS, type Level } from '../../domain/scoring.ts'
import { useAppData } from '../../state/dataContext.ts'
import type { RiskFilterState } from '../useRiskFilter.ts'
import styles from './RiskFilterBar.module.css'

interface RiskFilterBarProps {
  state: RiskFilterState
}

function byName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, 'nb', { sensitivity: 'base', numeric: true }),
  )
}

/** Nivånavn for filteret. Uten typefilter vises begge typenes navn, f.eks. «Høy / Stor». */
function levelLabel(level: Level, type: RiskType | undefined): string {
  if (type) return LEVEL_STYLES[type][level].name
  const threat = LEVEL_STYLES.threat[level].name
  const opportunity = LEVEL_STYLES.opportunity[level].name
  return threat === opportunity ? threat : `${threat} / ${opportunity}`
}

/** Søk og filtre for register og matrise (spec K4, K9). */
export function RiskFilterBar({ state }: RiskFilterBarProps) {
  const { filter, setFilter, reset, active } = state
  const data = useAppData()
  const id = useId()
  const owners = useMemo(() => byName(data.owners), [data.owners])
  const themes = useMemo(() => byName(data.themes), [data.themes])
  const areas = useMemo(() => byName(data.areas), [data.areas])

  return (
    <div role="search" className={styles.bar} aria-label="Filtrer risikoer">
      <div className={`${styles.field} ${styles.search}`}>
        <label htmlFor={`${id}-search`}>Søk</label>
        <input
          id={`${id}-search`}
          type="search"
          placeholder="Tittel eller beskrivelse"
          value={filter.search ?? ''}
          onChange={(event) => setFilter({ search: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-type`}>Type</label>
        <select
          id={`${id}-type`}
          value={filter.type ?? ''}
          onChange={(event) => setFilter({ type: (event.target.value || undefined) as RiskType })}
        >
          <option value="">Alle</option>
          {RISK_TYPES.map((type) => (
            <option key={type} value={type}>
              {RISK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-owner`}>Eier</label>
        <select
          id={`${id}-owner`}
          value={filter.ownerId ?? ''}
          onChange={(event) => setFilter({ ownerId: event.target.value || undefined })}
        >
          <option value="">Alle</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-theme`}>Tema</label>
        <select
          id={`${id}-theme`}
          value={filter.themeId ?? ''}
          onChange={(event) => setFilter({ themeId: event.target.value || undefined })}
        >
          <option value="">Alle</option>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-area`}>Område</label>
        <select
          id={`${id}-area`}
          value={filter.areaId ?? ''}
          onChange={(event) => setFilter({ areaId: event.target.value || undefined })}
        >
          <option value="">Alle</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-level`}>Nivå</label>
        <select
          id={`${id}-level`}
          value={filter.level ?? ''}
          onChange={(event) =>
            setFilter({ level: event.target.value ? (Number(event.target.value) as Level) : undefined })
          }
        >
          <option value="">Alle</option>
          {[...LEVELS].reverse().map((level) => (
            <option key={level} value={level}>
              {levelLabel(level, filter.type)}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <div className={styles.reset}>
          <button type="button" className="button" onClick={reset}>
            Nullstill filtre
          </button>
        </div>
      )}
    </div>
  )
}
