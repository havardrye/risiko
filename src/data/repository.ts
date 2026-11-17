import type { AppData } from '../domain/schema.ts'

/**
 * Lagring av hele datasettet. Grensesnittet er asynkront selv om lokal
 * lagring er synkron, slik at en delt backend kan settes inn senere uten
 * å endre resten av appen (se constitution og plan).
 */
export interface Repository {
  /**
   * Leser datasettet. Gir et tomt datasett hvis ingenting er lagret.
   * Kaster `StoredDataError` hvis det lagrede innholdet er ugyldig;
   * innholdet blir da stående urørt.
   */
  load(): Promise<AppData>

  /** Erstatter det lagrede datasettet. */
  save(data: AppData): Promise<void>

  /**
   * Varsler når data er endret, enten herfra eller fra en annen fane.
   * Returnerer en funksjon som avslutter abonnementet.
   */
  subscribe(listener: () => void): () => void
}

/** Lagret innhold kunne ikke leses. `raw` er innholdet slik det ligger lagret. */
export class StoredDataError extends Error {
  readonly raw: string
  readonly details: readonly string[]

  constructor(message: string, raw: string, details: readonly string[] = []) {
    super(message)
    this.name = 'StoredDataError'
    this.raw = raw
    this.details = details
  }
}
