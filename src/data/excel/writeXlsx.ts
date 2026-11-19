import type { DataValidation, Workbook, Worksheet } from 'exceljs'
import {
  DATA_SHEETS,
  GUIDE_SHEET_NAME,
  INFO_COLUMNS,
  type ColumnSpec,
} from '../../domain/excelFormat.ts'
import { CONSEQUENCE_LABELS, LIKELIHOOD_LABELS } from '../../domain/scales.ts'
import { emptyAppData, type AppData } from '../../domain/schema.ts'
import { RATINGS } from '../../domain/scoring.ts'
import { loadExcelJs } from './loadExcelJs.ts'
import { toWorkbookRows } from './toWorkbookRows.ts'
import type { CellValue } from './workbookRows.ts'

/**
 * Skriver datasettet som .xlsx (spec 002, K33, K35). Et tomt datasett gir
 * malen. Bare denne filen og `readXlsx` kjenner ExcelJS.
 */

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Radene som får nedtrekkslister. Rikelig for et register med noen hundre risikoer. */
export const VALIDATION_LAST_ROW = 1000

/**
 * Nedtrekkslister for et helt område. ExcelJS har dette (`worksheet.dataValidations`),
 * men typedefinisjonene mangler det. Én regel per område gir en mye mindre fil
 * enn én per celle.
 */
type SheetWithValidations = Worksheet & {
  dataValidations: { add(range: string, validation: DataValidation): void }
}

/** Skriver bare tekst og tall. Tekst som begynner med «=» blir tekst, ikke formel. */
function plain(value: CellValue): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

/** Excel-kolonnebokstav for kolonne 1, 2, … (A, B, …, Z, AA, …). */
function columnLetter(index: number): string {
  let letters = ''
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
  }
  return letters
}

/** Fanen som Excel-tabell, med fryst overskrift, bredder og nedtrekkslister. */
function addDataSheet(
  workbook: Workbook,
  name: string,
  columns: readonly ColumnSpec[],
  rows: readonly (readonly CellValue[])[],
): Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map((column) => ({ width: column.width }))

  // En tom tabell gir en fil Excel klager på; malen får derfor én tom rad å skrive i.
  const tableRows = rows.length > 0 ? rows.map((row) => row.map(plain)) : [columns.map(() => null)]
  sheet.addTable({
    name: `Tabell${name.replace(/å/g, 'aa').replace(/[^A-Za-z]/g, '')}`,
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columns.map((column) => ({ name: column.header })),
    rows: tableRows,
  })

  // Ingen merknader (cell.note) i disse fanene: ExcelJS skriver tabell og merknad
  // i samme fane slik at Excel ikke kan åpne filen (funnet i T34). At Score og Nivå
  // ikke leses inn, står derfor i fanen Veiledning.
  columns.forEach((column, index) => {
    const letter = columnLetter(index + 1)
    if (column.choices) {
      const allowed = column.choices.join(', ')
      ;(sheet as SheetWithValidations).dataValidations.add(`${letter}2:${letter}${VALIDATION_LAST_ROW}`, {
        type: 'list',
        allowBlank: true,
        formulae: [`"${column.choices.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: `Ugyldig verdi i ${column.header}`,
        error: `Velg en av verdiene i listen: ${allowed}.`,
      })
    }
  })
  return sheet
}

/** Veiledningen først i filen (K33): regler, kolonner og skalaer, laget fra formatet. */
function addGuideSheet(workbook: Workbook): void {
  const sheet = workbook.addWorksheet(GUIDE_SHEET_NAME)
  sheet.columns = [{ width: 16 }, { width: 22 }, { width: 22 }, { width: 22 }]
  const sheetNames = DATA_SHEETS.map((spec) => spec.name).join(', ')

  const heading = (text: string) => {
    sheet.addRow([])
    sheet.addRow([text]).font = { bold: true, size: 12 }
  }

  sheet.addRow(['Risikoregister – veiledning']).font = { bold: true, size: 14 }
  sheet.addRow([
    'Viktig: Når filen importeres i appen, erstattes ALLE data der med innholdet i filen. Eksporter en sikkerhetskopi først.',
  ]).font = { bold: true, color: { argb: 'FFB00020' } }

  heading('Slik fyller du ut')
  for (const line of [
    `Fyll ut fanene ${sheetNames}. Første rad i hver fane er overskrifter og skal ikke endres.`,
    'Eier-ID, Tema-ID og Område-ID i fanen Risikoer må være ID-er som står i fanene Eiere, Temaer og Områder.',
    'Navn må være unike i hver fane. Store og små bokstaver regnes som like.',
    'Kolonner med nedtrekksliste: velg en verdi fra listen.',
    'Score, Nivå, Eier, Tema og Område bakerst i fanen Risikoer er bare til informasjon og leses ikke inn.',
    'Du kan legge til egne kolonner og faner til notater. De leses ikke inn.',
  ]) {
    sheet.addRow([`• ${line}`])
  }

  heading('Kolonner')
  sheet.addRow(['Fane', 'Kolonne', 'Påkrevd', 'Lovlige verdier']).font = { bold: true }
  for (const spec of DATA_SHEETS) {
    for (const column of spec.columns) {
      sheet.addRow([spec.name, column.header, column.required ? 'Ja' : 'Nei', column.choices?.join(', ') ?? ''])
    }
  }

  heading('Skalaer')
  sheet.addRow(['Verdi', 'Sannsynlighet', 'Konsekvens, trussel', 'Konsekvens, mulighet']).font = { bold: true }
  for (const value of RATINGS) {
    sheet.addRow([
      value,
      LIKELIHOOD_LABELS[value],
      CONSEQUENCE_LABELS.threat[value],
      CONSEQUENCE_LABELS.opportunity[value],
    ])
  }
}

/** Hele arbeidsboken som fil. Tomt datasett gir malen (K33). */
export async function writeXlsx(data: AppData): Promise<Blob> {
  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Risikostyring'
  workbook.created = new Date()

  addGuideSheet(workbook)
  const rows = toWorkbookRows(data)
  for (const spec of DATA_SHEETS) {
    const columns: readonly ColumnSpec[] = [...spec.columns, ...(INFO_COLUMNS[spec.name] ?? [])]
    addDataSheet(
      workbook,
      spec.name,
      columns,
      rows[spec.name].rows.map((row) => row.cells),
    )
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer as ArrayBuffer], { type: XLSX_MIME_TYPE })
}

/** Den tomme malen (K33). */
export function writeTemplate(): Promise<Blob> {
  return writeXlsx(emptyAppData())
}
