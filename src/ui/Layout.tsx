import { useState, type MouseEvent } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppData } from '../state/dataContext.ts'
import { DataMenu } from './components/DataMenu.tsx'
import { StorageNotice } from './components/StorageNotice.tsx'
import { exportAppData, hasData } from './exportData.ts'
import styles from './Layout.module.css'
import { NAV_ITEMS, ROUTES } from './routes.ts'
import { filterSearch } from './useRiskFilter.ts'

/** Sidene som bruker filtrene. Filtrene følger med mellom dem (spec K9). */
const FILTERED_PATHS: readonly string[] = [ROUTES.risks.path, ROUTES.matrix.path]

/**
 * Appen bruker hash-ruting, så en vanlig lenke til «#innhold» ville blitt
 * tolket som en side. I stedet flyttes fokus direkte til hovedinnholdet.
 */
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  document.getElementById('innhold')?.focus()
}

/** Ramme rundt alle sidene: toppmeny og hovedinnhold. */
export function Layout() {
  const location = useLocation()
  const filters = filterSearch(location.search)
  const data = useAppData()
  const [status, setStatus] = useState<string>()

  function exportNow() {
    setStatus(`Eksportert til ${exportAppData(data)}.`)
  }

  return (
    <>
      <a href="#innhold" className={styles.skipLink} onClick={skipToContent}>
        Hopp til innhold
      </a>
      <header className={styles.header}>
        <p className={styles.appName}>Risikostyring</p>
        <nav aria-label="Hovedmeny">
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={{
                    pathname: item.path,
                    search: FILTERED_PATHS.includes(item.path) ? filters : '',
                  }}
                  end
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <DataMenu status={status} onStatus={setStatus} onExport={exportNow} />
      </header>
      <StorageNotice onExport={hasData(data) ? exportNow : undefined} />
      <main id="innhold" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </>
  )
}
