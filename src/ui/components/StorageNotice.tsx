import styles from './StorageNotice.module.css'

interface StorageNoticeProps {
  /** Utelatt når det ikke finnes noe å eksportere. */
  onExport: (() => void) | undefined
}

/**
 * Varsel om at data bare ligger i denne nettleseren (spec K23). Det er
 * synlig på alle sider, men holdes lite, og gir en snarvei til eksport.
 */
export function StorageNotice({ onExport }: StorageNoticeProps) {
  return (
    <aside className={styles.notice} aria-label="Om lagring">
      <span aria-hidden="true" className={styles.icon}>
        ⓘ
      </span>
      <p className={styles.text}>
        Data lagres bare i denne nettleseren og deles ikke automatisk med andre. Eksporter
        jevnlig for å ta vare på dem eller dele dem.
      </p>
      {onExport && (
        <button type="button" className={`button button-small ${styles.button}`} onClick={onExport}>
          Eksporter nå
        </button>
      )}
    </aside>
  )
}
