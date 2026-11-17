import type { AppData } from '../domain/schema.ts'
import { parseAppData, type ParseResult } from './parseAppData.ts'

/**
 * Eksport og import av hele datasettet som JSON-fil (spec K20, K21).
 * Rene funksjoner: de leser og skriver ikke lagring selv. Den som kaller
 * `parseImportFile` lagrer bare hvis resultatet er gyldig, slik at en
 * ugyldig fil aldri endrer eksisterende data.
 */

/** Antall elementer i et datasett, til bekreftelsen før import erstatter data. */
export interface DataSummary {
  risks: number
  owners: number
  themes: number
  areas: number
}

export function summarize(data: AppData): DataSummary {
  return {
    risks: data.risks.length,
    owners: data.owners.length,
    themes: data.themes.length,
    areas: data.areas.length,
  }
}

/** Innholdet i eksportfilen. Samme format som i lagringen, men lesbart formatert. */
export function serializeAppData(data: AppData): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

/** F.eks. «risikoregister-2026-11-17.json», med brukerens lokale dato. */
export function exportFileName(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `risikoregister-${year}-${month}-${day}.json`
}

/** Tolker og validerer innholdet i en importfil, med samme krav som ved lesing fra lagring. */
export function parseImportFile(text: string): ParseResult {
  if (text.trim() === '') {
    return { ok: false, message: 'Filen er tom.', details: [] }
  }
  return parseAppData(text)
}
