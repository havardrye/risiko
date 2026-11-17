import { exportFileName, serializeAppData } from '../data/exportImport.ts'
import type { AppData } from '../domain/schema.ts'
import { downloadTextFile } from './download.ts'

/** Laster ned hele datasettet som JSON-fil (spec K20). Returnerer filnavnet. */
export function exportAppData(data: AppData): string {
  const fileName = exportFileName()
  downloadTextFile(fileName, serializeAppData(data))
  return fileName
}

/** Sant hvis det finnes noe å eksportere. */
export function hasData(data: AppData): boolean {
  return (
    data.risks.length + data.owners.length + data.themes.length + data.areas.length > 0
  )
}
