import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { countMissingCodes, findMissingCodes } from '../../domain/rules.ts'
import { useAppData } from '../../state/dataContext.ts'
import { EDIT_REFERENCE_PARAM, OPEN_RISK_PARAM, ROUTES } from '../routes.ts'
import styles from './MissingCodesNotice.module.css'

/** Entall og flertall for hver type, i den rekkefølgen de nevnes. */
const KINDS = [
  { list: 'risks', one: 'risiko', many: 'risikoer', label: 'Risiko' },
  { list: 'owners', one: 'eier', many: 'eiere', label: 'Eier' },
  { list: 'themes', one: 'tema', many: 'temaer', label: 'Tema' },
  { list: 'areas', one: 'område', many: 'områder', label: 'Område' },
] as const

const LINK_FOR = {
  risks: (id: string) => ({ pathname: ROUTES.risks.path, search: `?${OPEN_RISK_PARAM}=${encodeURIComponent(id)}` }),
  owners: (id: string) => ({ pathname: ROUTES.owners.path, search: `?${EDIT_REFERENCE_PARAM}=${encodeURIComponent(id)}` }),
  themes: (id: string) => ({ pathname: ROUTES.themes.path, search: `?${EDIT_REFERENCE_PARAM}=${encodeURIComponent(id)}` }),
  areas: (id: string) => ({ pathname: ROUTES.areas.path, search: `?${EDIT_REFERENCE_PARAM}=${encodeURIComponent(id)}` }),
}

/** «a», «a og b», «a, b og c». */
function joinNorwegian(parts: readonly string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} og ${parts.at(-1)}`
}

/**
 * Varsel om elementer som mangler ID (spec 004, K54). Vises bare så lenge
 * noe mangler ID, og lenker til hvert element så det kan rettes.
 */
export function MissingCodesNotice() {
  const data = useAppData()
  const missing = useMemo(() => findMissingCodes(data), [data])
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  if (countMissingCodes(missing) === 0) return null

  const summary = joinNorwegian(
    KINDS.filter((kind) => missing[kind.list].length > 0).map((kind) => {
      const count = missing[kind.list].length
      return `${count} ${count === 1 ? kind.one : kind.many}`
    }),
  )

  return (
    <section className={styles.notice} aria-label="Elementer uten ID">
      <p className={styles.text}>{summary} mangler ID.</p>
      <button
        type="button"
        className={`button button-small ${styles.button}`}
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? 'Skjul' : 'Vis'}
      </button>
      <ul id={listId} className={styles.list} hidden={!expanded}>
        {KINDS.flatMap((kind) =>
          missing[kind.list].map((item) => (
            <li key={`${kind.list}-${item.id}`}>
              <span className={styles.kind}>{kind.label}:</span>{' '}
              <Link to={LINK_FOR[kind.list](item.id)}>{'title' in item ? item.title : item.name}</Link>
            </li>
          )),
        )}
      </ul>
    </section>
  )
}
