import { useState } from 'react'
import { StoredDataError } from '../data/repository.ts'
import { emptyAppData } from '../domain/schema.ts'
import { useDataStore } from '../state/dataContext.ts'
import { ConfirmDialog } from './components/ConfirmDialog.tsx'
import { downloadTextFile } from './download.ts'
import styles from './StoredDataErrorPage.module.css'
import { usePageTitle } from './usePageTitle.ts'

interface StoredDataErrorPageProps {
  error: unknown
}

/**
 * Vises når det lagrede innholdet ikke kan leses. Innholdet blir stående
 * urørt til brukeren selv velger å starte med tomt register (se plan:
 * data skal aldri overskrives stille).
 */
export function StoredDataErrorPage({ error }: StoredDataErrorPageProps) {
  usePageTitle('Kan ikke lese lagrede data')
  const store = useDataStore()
  const [confirming, setConfirming] = useState(false)
  const [resetError, setResetError] = useState<string>()

  const stored = error instanceof StoredDataError ? error : undefined

  async function startEmpty() {
    setConfirming(false)
    try {
      await store.replaceAll(emptyAppData())
    } catch {
      setResetError('Kunne ikke lagre. Prøv igjen.')
    }
  }

  return (
    <main className={styles.page}>
      <h1>Kan ikke lese lagrede data</h1>
      <p>
        Risikoregisteret som er lagret i denne nettleseren kan ikke leses. Ingenting er endret eller
        slettet.
      </p>

      {stored ? (
        <>
          <p className={styles.reason}>{stored.message}</p>
          {stored.details.length > 0 && (
            <ul>
              {stored.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className={styles.reason}>Det oppsto en uventet feil ved lesing.</p>
      )}

      <h2 className={styles.heading}>Hva du kan gjøre</h2>
      <ol>
        {stored && (
          <li>
            Last ned det lagrede innholdet, slik at det kan rettes eller hentes fram igjen senere.
          </li>
        )}
        <li>Prøv å lese på nytt, i tilfelle feilen var forbigående.</li>
        <li>Start med et tomt register. Da erstattes det lagrede innholdet.</li>
      </ol>

      <div className={styles.actions}>
        {stored && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => downloadTextFile('risikoregister-uleselig.txt', stored.raw, 'text/plain')}
          >
            Last ned lagret innhold
          </button>
        )}
        <button type="button" className="button" onClick={() => void store.reload()}>
          Prøv å lese på nytt
        </button>
        <button type="button" className="button" onClick={() => setConfirming(true)}>
          Start med tomt register
        </button>
      </div>

      {resetError && (
        <p role="alert" className={styles.reason}>
          {resetError}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="Starte med tomt register?"
        confirmLabel="Erstatt med tomt register"
        danger
        onConfirm={() => void startEmpty()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Det lagrede innholdet blir erstattet og kan ikke hentes tilbake herfra.
          {stored && ' Last det ned først hvis du vil ta vare på det.'}
        </p>
      </ConfirmDialog>
    </main>
  )
}
