import { useId, useRef, useState, type ChangeEvent } from 'react'
import { excelTemplate, exportExcel, importExcel, isXlsx } from '../../data/excel/index.ts'
import { XLSX_MIME_TYPE } from '../../data/excel/writeXlsx.ts'
import {
  exportFileName,
  parseImportFile,
  summarize,
  TEMPLATE_FILE_NAME,
  type DataSummary,
} from '../../data/exportImport.ts'
import type { AppData } from '../../domain/schema.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { downloadBlob } from '../download.ts'
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

/** Valgene i eksportdialogen (spec 002, K33–K35). */
const EXPORT_CHOICES = [
  {
    kind: 'excel',
    label: 'Excel (for redigering)',
    description: 'Alle data i en Excel-fil du kan redigere og importere igjen.',
  },
  {
    kind: 'json',
    label: 'Sikkerhetskopi (JSON)',
    description: 'Alle data nøyaktig slik de er lagret. Bruk denne til sikkerhetskopi.',
  },
  {
    kind: 'template',
    label: 'Tom Excel-mal',
    description: 'En tom Excel-fil med riktige faner, kolonner og nedtrekkslister.',
  },
] as const

type ExportKind = (typeof EXPORT_CHOICES)[number]['kind']

const EXCEL_FAILED = 'Excel-filen kunne ikke lages. Sjekk nettforbindelsen, last siden på nytt og prøv igjen.'

interface DataMenuProps {
  /** Bekreftelse som vises ved knappene, f.eks. etter eksport. */
  status: string | undefined
  onStatus: (status: string | undefined) => void
  /** Eksporterer JSON og melder fra i statusfeltet. Deles med lagringsvarselet. */
  onExport: () => void
}

/**
 * Eksport og import av hele datasettet (spec K20, K21). Importen tar imot
 * både JSON og Excel (spec 002, K26–K32); formatet avgjøres av innholdet.
 */
export function DataMenu({ status, onStatus: setStatus, onExport }: DataMenuProps) {
  const data = useAppData()
  const store = useDataStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [importState, setImportState] = useState<ImportState>(IDLE)
  /** Sant mens en Excel-fil leses; knappene er da sperret. */
  const [busy, setBusy] = useState(false)
  const [choosingExport, setChoosingExport] = useState(false)
  /** Hindrer at et dobbeltklikk lager to filer. Knappen sperres ikke, så fokus kan gå tilbake til den. */
  const exporting = useRef(false)
  const choiceIdPrefix = useId()

  async function exportAs(kind: ExportKind) {
    setChoosingExport(false)
    if (kind === 'json') {
      onExport()
      return
    }
    if (exporting.current) return
    exporting.current = true
    setStatus('Lager Excel-fil …')
    try {
      if (kind === 'excel') {
        const fileName = exportFileName(new Date(), 'xlsx')
        downloadBlob(fileName, await exportExcel(data))
        setStatus(`Eksportert til ${fileName}.`)
      } else {
        downloadBlob(TEMPLATE_FILE_NAME, await excelTemplate())
        setStatus(`Malen er lastet ned: ${TEMPLATE_FILE_NAME}.`)
      }
    } catch {
      setStatus(EXCEL_FAILED)
    } finally {
      exporting.current = false
    }
  }

  async function fileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    // Tømmes, slik at samme fil kan velges igjen.
    input.value = ''
    if (!file) return

    setStatus(undefined)
    let bytes: ArrayBuffer
    try {
      bytes = await file.arrayBuffer()
    } catch {
      setImportState({
        type: 'error',
        fileName: file.name,
        message: 'Filen kunne ikke leses.',
        details: [],
      })
      return
    }

    let result: Awaited<ReturnType<typeof importExcel>>
    if (isXlsx(bytes)) {
      setBusy(true)
      setStatus('Leser Excel-fil …')
      try {
        result = await importExcel(bytes)
      } finally {
        setBusy(false)
        setStatus(undefined)
      }
    } else {
      result = parseImportFile(new TextDecoder().decode(bytes))
    }
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
      <button
        type="button"
        className="button button-small"
        onClick={() => setChoosingExport(true)}
        disabled={busy}
      >
        Eksporter
      </button>
      <button
        type="button"
        className="button button-small"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
      >
        Importer
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={`.json,application/json,.xlsx,${XLSX_MIME_TYPE}`}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-file"
        onChange={(event) => void fileChosen(event)}
      />
      <p className={styles.status} role="status">
        {status}
      </p>

      <Dialog open={choosingExport} title="Eksporter" onClose={() => setChoosingExport(false)}>
        <ul className={styles.choices}>
          {EXPORT_CHOICES.map((choice) => (
            <li key={choice.kind}>
              <button
                type="button"
                className={`button ${styles.choice}`}
                aria-describedby={`${choiceIdPrefix}-${choice.kind}`}
                onClick={() => void exportAs(choice.kind)}
              >
                {choice.label}
              </button>
              <p id={`${choiceIdPrefix}-${choice.kind}`} className={styles.choiceDescription}>
                {choice.description}
              </p>
            </li>
          ))}
        </ul>
        <DialogActions>
          <button type="button" className="button" onClick={() => setChoosingExport(false)}>
            Avbryt
          </button>
        </DialogActions>
      </Dialog>

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
                {importState.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
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
