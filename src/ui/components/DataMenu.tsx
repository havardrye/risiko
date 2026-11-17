import { useRef, useState, type ChangeEvent } from 'react'
import { parseImportFile, summarize, type DataSummary } from '../../data/exportImport.ts'
import type { AppData } from '../../domain/schema.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import styles from './DataMenu.module.css'
import { Dialog, DialogActions } from './Dialog.tsx'

type ImportState =
  | { type: 'idle' }
  | { type: 'confirm'; fileName: string; data: AppData }
  | { type: 'error'; fileName: string; message: string; details: string[] }

const IDLE: ImportState = { type: 'idle' }

function summaryText({ risks, owners, themes, areas }: DataSummary): string {
  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`
  return [
    plural(risks, 'risiko', 'risikoer'),
    plural(owners, 'eier', 'eiere'),
    plural(themes, 'tema', 'temaer'),
    plural(areas, 'område', 'områder'),
  ].join(', ')
}

interface DataMenuProps {
  /** Bekreftelse som vises ved knappene, f.eks. etter eksport. */
  status: string | undefined
  onStatus: (status: string | undefined) => void
  /** Eksporterer og melder fra i statusfeltet. Deles med lagringsvarselet. */
  onExport: () => void
}

/** Eksport og import av hele datasettet som JSON-fil (spec K20, K21). */
export function DataMenu({ status, onStatus: setStatus, onExport }: DataMenuProps) {
  const data = useAppData()
  const store = useDataStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [importState, setImportState] = useState<ImportState>(IDLE)

  async function fileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    // Tømmes, slik at samme fil kan velges igjen.
    input.value = ''
    if (!file) return

    setStatus(undefined)
    let text: string
    try {
      text = await file.text()
    } catch {
      setImportState({
        type: 'error',
        fileName: file.name,
        message: 'Filen kunne ikke leses.',
        details: [],
      })
      return
    }

    const result = parseImportFile(text)
    setImportState(
      result.ok
        ? { type: 'confirm', fileName: file.name, data: result.data }
        : { type: 'error', fileName: file.name, ...result },
    )
  }

  async function confirmImport(next: AppData) {
    setImportState(IDLE)
    try {
      await store.replaceAll(next)
      setStatus(`Importert: ${summaryText(summarize(next))}.`)
    } catch {
      setStatus('Importen kunne ikke lagres. Ingenting er endret.')
    }
  }

  return (
    <div className={styles.menu}>
      <button type="button" className="button button-small" onClick={onExport}>
        Eksporter
      </button>
      <button
        type="button"
        className="button button-small"
        onClick={() => fileInput.current?.click()}
      >
        Importer
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-file"
        onChange={(event) => void fileChosen(event)}
      />
      <p className={styles.status} role="status">
        {status}
      </p>

      <ConfirmDialog
        open={importState.type === 'confirm'}
        title="Erstatte alle data?"
        confirmLabel="Erstatt alle data"
        danger
        onConfirm={() => {
          if (importState.type === 'confirm') void confirmImport(importState.data)
        }}
        onCancel={() => setImportState(IDLE)}
      >
        {importState.type === 'confirm' && (
          <>
            <p>
              Importen erstatter alt som er lagret i denne nettleseren med innholdet i «
              {importState.fileName}». Dette kan ikke angres.
            </p>
            <dl className={styles.summary}>
              <dt>Erstattes</dt>
              <dd>{summaryText(summarize(data))}</dd>
              <dt>Fra filen</dt>
              <dd>{summaryText(summarize(importState.data))}</dd>
            </dl>
            <p className="muted">Eksporter først hvis du vil ta vare på dagens data.</p>
          </>
        )}
      </ConfirmDialog>

      <Dialog
        open={importState.type === 'error'}
        title="Kan ikke importere filen"
        onClose={() => setImportState(IDLE)}
      >
        {importState.type === 'error' && (
          <>
            <p>
              «{importState.fileName}» ble ikke importert. Ingenting er endret.
            </p>
            <p className={styles.error}>{importState.message}</p>
            {importState.details.length > 0 && (
              <ul>
                {importState.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
            <DialogActions>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setImportState(IDLE)}
              >
                Lukk
              </button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  )
}
