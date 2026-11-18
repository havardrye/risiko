/**
 * Innholdet i en Excel-fil som rene data (spec 002). `readXlsx` lager dette
 * fra en fil, og `parseWorkbook` tolker det. Ingen ExcelJS-typer her, så
 * tolkingen kan testes uten filer.
 */

/**
 * En celle som ikke kan brukes som verdi, f.eks. en formelfeil (#REF!) eller
 * en dato. `readXlsx` forklarer hva som er galt, og tolkingen gjør det til en feil.
 */
export interface CellProblem {
  problem: string
}

/** En celle etter lesing: tekst, tall, tom eller et problem. */
export type CellValue = string | number | null | CellProblem

export interface SheetRow {
  /** Radnummeret slik Excel viser det (overskriften er rad 1). */
  rowNumber: number
  /** Cellene i samme rekkefølge som overskriftene. */
  cells: CellValue[]
}

export interface SheetRows {
  /** Overskriftene på rad 1, slik de står i filen. */
  headers: string[]
  rows: SheetRow[]
}

/** Alle faner i filen. Nøkkelen er fanenavnet slik det står i filen. */
export type WorkbookRows = Record<string, SheetRows>

/** En feil i filen, så presis som mulig: fane, rad og kolonne (K28). */
export interface CellError {
  sheet: string
  row?: number
  column?: string
  message: string
}

/** F.eks. «Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»». */
export function formatCellError({ sheet, row, column, message }: CellError): string {
  const place = [sheet, row === undefined ? undefined : `rad ${row}`, column]
    .filter((part) => part !== undefined)
    .join(', ')
  return `${place}: ${message}`
}

/** Sorterer feil etter fane (i gitt rekkefølge) og deretter rad (K28). */
export function sortCellErrors(errors: readonly CellError[], sheetOrder: readonly string[]): CellError[] {
  const sheetIndex = (sheet: string) => {
    const index = sheetOrder.indexOf(sheet)
    return index === -1 ? sheetOrder.length : index
  }
  return [...errors].sort(
    (a, b) => sheetIndex(a.sheet) - sheetIndex(b.sheet) || (a.row ?? 0) - (b.row ?? 0),
  )
}
