import {
  AREA_SHEET,
  OWNER_SHEET,
  RISK_INFO_COLUMNS,
  RISK_SHEET,
  THEME_SHEET,
  type ColumnSpec,
  type SheetSpec,
} from '../../domain/excelFormat.ts'
import { HORIZON_LABELS, levelStyle, RISK_TYPE_LABELS } from '../../domain/scales.ts'
import type { AppData, Id } from '../../domain/schema.ts'
import { level, score } from '../../domain/scoring.ts'
import type { CellValue, SheetRows, WorkbookRows } from './workbookRows.ts'

/**
 * Gjør datasettet om til rader i Excel-formatet (spec 002, K35): navn i
 * stedet for id-er og de samme tekstene som i appen. Det motsatte av
 * `parseWorkbook`, slik at en eksportert fil kan importeres igjen.
 */

/** Rader fra rad 2, med cellene i samme rekkefølge som kolonnene. */
function sheetRows<K extends string>(
  columns: readonly ColumnSpec<K>[],
  items: readonly Record<K, CellValue>[],
): SheetRows {
  return {
    headers: columns.map((column) => column.header),
    rows: items.map((item, index) => ({
      rowNumber: index + 2,
      cells: columns.map((column) => item[column.key]),
    })),
  }
}

const text = (value: string | undefined): CellValue => value ?? null

function namesById(items: readonly { id: Id; name: string }[]): Map<Id, string> {
  return new Map(items.map((item) => [item.id, item.name]))
}

export function toWorkbookRows(data: AppData): WorkbookRows {
  const owners = namesById(data.owners)
  const themes = namesById(data.themes)
  const areas = namesById(data.areas)
  const nameOf = (names: Map<Id, string>, id: Id): CellValue => names.get(id) ?? null

  const riskColumns = [...RISK_SHEET.columns, ...RISK_INFO_COLUMNS]
  const sheet = <K extends string>(spec: SheetSpec<K>, items: readonly Record<K, CellValue>[]) =>
    sheetRows(spec.columns, items)

  return {
    [RISK_SHEET.name]: sheetRows(
      riskColumns,
      data.risks.map((risk) => ({
        title: risk.title,
        description: text(risk.description),
        type: RISK_TYPE_LABELS[risk.type],
        owner: nameOf(owners, risk.ownerId),
        theme: nameOf(themes, risk.themeId),
        area: nameOf(areas, risk.areaId),
        likelihood: risk.likelihood,
        consequence: risk.consequence,
        score: score(risk.likelihood, risk.consequence),
        level: levelStyle(risk.type, level(risk.likelihood, risk.consequence)).name,
      })),
    ),
    [OWNER_SHEET.name]: sheet(
      OWNER_SHEET,
      data.owners.map((owner) => ({ name: owner.name, email: text(owner.email) })),
    ),
    [THEME_SHEET.name]: sheet(
      THEME_SHEET,
      data.themes.map((theme) => ({ name: theme.name, description: text(theme.description) })),
    ),
    [AREA_SHEET.name]: sheet(
      AREA_SHEET,
      data.areas.map((area) => ({
        name: area.name,
        horizon: HORIZON_LABELS[area.horizon],
        description: text(area.description),
      })),
    ),
  }
}
