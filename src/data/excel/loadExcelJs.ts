/**
 * Laster ExcelJS (spec 002). Biblioteket er stort, så den lastes
 * først når noen faktisk importerer eller eksporterer Excel, og havner i en
 * egen del av bygget. Alt kjører i nettleseren; ingen data sendes ut (K27).
 */

type ExcelJsModule = typeof import('exceljs')

let loading: Promise<ExcelJsModule> | undefined

/** Laster ExcelJS én gang. Feiler lastingen, kan den prøves igjen senere. */
export function loadExcelJs(): Promise<ExcelJsModule> {
  loading ??= import('exceljs')
    .then((module) => (module as { default?: ExcelJsModule }).default ?? module)
    .catch((error: unknown) => {
      loading = undefined
      throw error
    })
  return loading
}
