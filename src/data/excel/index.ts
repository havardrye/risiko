import type { AppData } from '../../domain/schema.ts'
import { parseWorkbook } from './parseWorkbook.ts'
import { readXlsx } from './readXlsx.ts'
import { formatCellError } from './workbookRows.ts'

/**
 * Excel-støtten slik brukergrensesnittet ser den (spec 002). ExcelJS lastes
 * først når en av funksjonene brukes (se loadExcelJs.ts).
 */

export { writeTemplate as excelTemplate, writeXlsx as exportExcel } from './writeXlsx.ts'

/** Så mange feil vises i feildialogen; resten oppsummeres (K28). */
export const MAX_SHOWN_ERRORS = 50

/** Samme form som JSON-importen, så dialogene kan gjenbrukes. */
export type ExcelImport =
  | { ok: true; data: AppData }
  | { ok: false; message: string; details: string[] }

/** En .xlsx-fil er en zip-fil og starter med «PK». JSON gjør aldri det. */
export function isXlsx(bytes: ArrayBuffer): boolean {
  const start = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength))
  return start.length === 2 && start[0] === 0x50 && start[1] === 0x4b
}

const errorCount = (count: number) => (count === 1 ? '1 feil' : `${count} feil`)

/**
 * Leser og kontrollerer en Excel-fil (K26–K30). Endrer ingenting selv;
 * den som kaller, lagrer bare hvis resultatet er gyldig og bruker bekrefter.
 */
export async function importExcel(bytes: ArrayBuffer): Promise<ExcelImport> {
  let read: Awaited<ReturnType<typeof readXlsx>>
  try {
    read = await readXlsx(bytes)
  } catch {
    // Typisk når ExcelJS ikke kunne lastes, f.eks. uten nett etter en ny versjon.
    return {
      ok: false,
      message: 'Excel-støtten kunne ikke lastes. Sjekk nettforbindelsen, last siden på nytt og prøv igjen.',
      details: [],
    }
  }
  if (!read.ok) return { ok: false, message: read.message, details: [] }

  const result = parseWorkbook(read.rows)
  if (result.ok) return result

  const details = result.errors.slice(0, MAX_SHOWN_ERRORS).map(formatCellError)
  const hidden = result.errors.length - details.length
  if (hidden > 0) details.push(`… og ${errorCount(hidden)} til.`)
  return {
    ok: false,
    message: `Filen har ${errorCount(result.errors.length)}. Rett ${
      result.errors.length === 1 ? 'den' : 'dem'
    } i Excel og importer på nytt.`,
    details,
  }
}
