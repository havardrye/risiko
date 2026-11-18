import type { CellValue as ExcelCellValue, Worksheet } from 'exceljs'
import { loadExcelJs } from './loadExcelJs.ts'
import type { CellValue, SheetRows, WorkbookRows } from './workbookRows.ts'

/**
 * Leser en .xlsx-fil til rene rader (spec 002, K26, K27, K30). Bare denne
 * filen og `writeXlsx` kjenner ExcelJS. Alt skjer i nettleseren.
 */

/** Største filstørrelse som leses. Et register på noen hundre risikoer er langt under 1 MB. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export type ReadResult = { ok: true; rows: WorkbookRows } | { ok: false; message: string }

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toLocaleString('nb', { maximumFractionDigits: 1 })

/** Gjør én ExcelJS-celle om til tekst, tall, tom eller et problem som forklarer hva som er galt. */
export function toCellValue(value: ExcelCellValue | undefined): CellValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : { problem: 'Cellen har et ugyldig tall.' }
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') {
    return { problem: 'Cellen inneholder en sannhetsverdi (SANN/USANN). Skriv verdien som tekst eller tall.' }
  }
  if (value instanceof Date) {
    return { problem: 'Cellen inneholder en dato. Skriv verdien som tekst eller tall.' }
  }
  if ('error' in value) return { problem: `Cellen har en formelfeil (${value.error}).` }
  if ('richText' in value) return value.richText.map((part) => part.text).join('')
  if ('hyperlink' in value) {
    // Excel gjør ofte e-postadresser om til lenker; lenketeksten er verdien.
    const text = value.text as unknown
    return typeof text === 'string' ? text : toCellValue(text as ExcelCellValue)
  }
  if ('formula' in value || 'sharedFormula' in value) {
    // Formler kjøres aldri; bare resultatet Excel har lagret, brukes.
    const result = value.result
    if (result === undefined) {
      return { problem: 'Formelen har ikke noe lagret resultat. Åpne filen i Excel og lagre den på nytt.' }
    }
    return toCellValue(result as ExcelCellValue)
  }
  return { problem: 'Cellen har et innhold appen ikke kan lese.' }
}

/** Overskriftene på rad 1. Tomme celler og celler som ikke er tekst blir tom tekst. */
function readHeaders(sheet: Worksheet): string[] {
  const row = sheet.getRow(1)
  const headers: string[] = []
  for (let column = 1; column <= row.cellCount; column += 1) {
    const value = toCellValue(row.getCell(column).value)
    headers.push(typeof value === 'string' || typeof value === 'number' ? String(value) : '')
  }
  return headers
}

function readSheet(sheet: Worksheet): SheetRows {
  const headers = readHeaders(sheet)
  const rows: SheetRows['rows'] = []
  // Bare kolonner med overskrift leses; resten er notater e.l. og ignoreres uansett.
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const cells = headers.map((_, index) => toCellValue(row.getCell(index + 1).value))
    rows.push({ rowNumber, cells })
  })
  return { headers, rows }
}

/**
 * Leser alle faner i filen. Både Excel-tabeller og vanlige celleområder
 * leses som vanlige rader, så det virker uansett hvordan arket er laget.
 */
export async function readXlsx(buffer: ArrayBuffer): Promise<ReadResult> {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `Filen er for stor (${megabytes(buffer.byteLength)} MB). Den kan være på høyst ${megabytes(MAX_FILE_BYTES)} MB.`,
    }
  }

  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    return { ok: false, message: 'Filen kunne ikke leses som en Excel-fil (.xlsx).' }
  }

  const rows: WorkbookRows = {}
  for (const sheet of workbook.worksheets) {
    rows[sheet.name] = readSheet(sheet)
  }
  return { ok: true, rows }
}
