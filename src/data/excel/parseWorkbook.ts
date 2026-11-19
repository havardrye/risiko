import { z } from 'zod'
import {
  AREA_SHEET,
  DATA_SHEETS,
  findColumns,
  findSheetName,
  OWNER_SHEET,
  RISK_SHEET,
  RISK_TYPE_CHOICES,
  THEME_SHEET,
  type SheetSpec,
} from '../../domain/excelFormat.ts'
import { findByCode, findIntegrityErrors, normalizeName } from '../../domain/rules.ts'
import { RISK_TYPES } from '../../domain/scales.ts'
import {
  appDataSchema,
  areaInputSchema,
  ownerInputSchema,
  riskInputSchema,
  SCHEMA_VERSION,
  themeInputSchema,
  type AppData,
  type Area,
  type AreaInput,
  type Id,
  type Owner,
  type OwnerInput,
  type Rating,
  type Risk,
  type RiskType,
  type Theme,
  type ThemeInput,
} from '../../domain/schema.ts'
import { sortCellErrors, type CellError, type CellValue, type SheetRows, type WorkbookRows } from './workbookRows.ts'

/**
 * Tolker innholdet i en Excel-fil (spec 002, K26, K28–K30).
 * Rene funksjoner: tar `WorkbookRows` (fra `readXlsx`) og gir data eller feil.
 */

// --- Verdier ---

/** «a», «a» eller «b», «a», «b» eller «c». */
function listChoices(choices: readonly string[]): string {
  const quoted = choices.map((choice) => `«${choice}»`)
  return quoted.length <= 1
    ? quoted.join('')
    : `${quoted.slice(0, -1).join(', ')} eller ${quoted[quoted.length - 1]}`
}

type Interpreted<T> = { ok: true; value: T } | { ok: false; message: string }

/** Type: «Trussel» eller «Mulighet», uten hensyn til store/små bokstaver. */
export function interpretRiskType(text: string): Interpreted<RiskType> {
  const wanted = text.toLocaleLowerCase('nb')
  const index = RISK_TYPE_CHOICES.findIndex((choice) => choice.toLocaleLowerCase('nb') === wanted)
  return index === -1
    ? { ok: false, message: `«${text}» er ikke en lovlig verdi. Bruk ${listChoices(RISK_TYPE_CHOICES)}.` }
    : { ok: true, value: RISK_TYPES[index] }
}

/** Sannsynlighet og konsekvens: heltall 1–5, som tall eller tekst. */
export function interpretRating(value: string | number): Interpreted<Rating> {
  const number = typeof value === 'number' ? value : /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(number) && number >= 1 && number <= 5
    ? { ok: true, value: number as Rating }
    : { ok: false, message: `«${value}» er ikke en lovlig verdi. Bruk et heltall fra 1 til 5.` }
}

// --- Rader ---

/** En tolket rad med radnummeret fra filen. */
export interface ParsedRow<T> {
  rowNumber: number
  value: T
}

/** En risiko slik den står i filen: eier, tema og område er navn, ikke id-er. */
export interface RiskRow {
  /** Brukerens ID (spec 004). */
  code: string
  title: string
  description?: string
  type: RiskType
  likelihood: Rating
  consequence: Rating
  owner: string
  theme: string
  area: string
}

export interface ParsedSheets {
  owners: ParsedRow<OwnerInput>[]
  themes: ParsedRow<ThemeInput>[]
  areas: ParsedRow<AreaInput>[]
  risks: ParsedRow<RiskRow>[]
  /** Rader med feil er ikke med i listene over, bare her. */
  errors: CellError[]
  /** Hva som ikke ble lest i eiere, temaer og områder, så oppslag ikke gir følgefeil. */
  rejected: Record<ReferenceSheet, RejectedRows>
}

export type ReferenceSheet = 'owners' | 'themes' | 'areas'

export interface RejectedRows {
  /** Usann når fanen mangler eller mangler kolonner, så ingen rader ble lest. */
  sheetRead: boolean
  /** ID-ene til rader som ble avvist på grunn av feil (spec 005: risikoer viser til ID). */
  codes: string[]
}

interface SheetResult<T> extends RejectedRows {
  rows: ParsedRow<T>[]
}

/** Celleverdi som tekst; tomme celler og celler med bare mellomrom blir undefined. */
function cellText(cell: CellValue | undefined): string | number | undefined {
  if (cell === null || cell === undefined) return undefined
  if (typeof cell === 'number') return cell
  if (typeof cell === 'string') {
    const trimmed = cell.trim()
    return trimmed === '' ? undefined : trimmed
  }
  return undefined
}

type Converter = (value: string | number) => Interpreted<unknown>

interface RowSchema<K extends string> {
  sheet: SheetSpec<K>
  /** Tolking av kolonner med faste verdier. Andre kolonner blir tekst. */
  convert: Partial<Record<K, Converter>>
  schema: z.ZodType
}

/**
 * Leser én fane: finner kolonnene, hopper over tomme rader (K30), tolker
 * verdiene og validerer hver rad med appens skjema (K28). Feil får fane,
 * rad og kolonne.
 */
function parseSheet<K extends string, T>(
  workbook: WorkbookRows,
  { sheet, convert, schema }: RowSchema<K>,
  errors: CellError[],
): SheetResult<T> {
  const unread: SheetResult<T> = { rows: [], sheetRead: false, codes: [] }
  const fileSheetName = findSheetName(Object.keys(workbook), sheet.name)
  if (fileSheetName === undefined) {
    errors.push({ sheet: sheet.name, message: `Fanen «${sheet.name}» mangler` })
    return unread
  }

  const { headers, rows }: SheetRows = workbook[fileSheetName]
  const { indexes, missing, duplicates } = findColumns(headers, sheet)
  for (const column of missing) {
    errors.push({ sheet: sheet.name, column: column.header, message: `Kolonnen «${column.header}» mangler` })
  }
  for (const column of duplicates) {
    errors.push({
      sheet: sheet.name,
      column: column.header,
      message: `Kolonnen «${column.header}» står flere ganger`,
    })
  }
  // Uten alle kolonnene ville hver rad gitt samme feil om igjen; én feil per kolonne holder.
  if (missing.length > 0 || duplicates.length > 0) return unread

  const headerOf = Object.fromEntries(sheet.columns.map((column) => [column.key, column.header])) as Record<K, string>
  const parsed: ParsedRow<T>[] = []
  const rejectedCodes: string[] = []

  for (const { rowNumber, cells } of rows) {
    const known = sheet.columns.flatMap((column) => {
      const index = indexes[column.key]
      return index === undefined ? [] : [{ column, cell: cells[index] ?? null }]
    })
    const isEmpty = known.every(({ cell }) => cellText(cell) === undefined && !isProblem(cell))
    if (isEmpty) continue

    const rowErrors: CellError[] = []
    const failedKeys = new Set<string>()
    const input: Record<string, unknown> = {}

    for (const { column, cell } of known) {
      const fail = (message: string) => {
        failedKeys.add(column.key)
        rowErrors.push({ sheet: sheet.name, row: rowNumber, column: column.header, message })
      }
      if (isProblem(cell)) {
        fail(cell.problem)
        continue
      }
      const value = cellText(cell)
      if (value === undefined) {
        // Samme melding for alle påkrevde kolonner, f.eks. «Eier er påkrevd».
        if (column.required) fail(`${column.header} er påkrevd`)
        continue
      }

      const converter = convert[column.key]
      if (converter) {
        const result = converter(value)
        if (result.ok) input[column.key] = result.value
        else fail(result.message)
      } else {
        input[column.key] = String(value)
      }
    }

    const validation = schema.safeParse(input)
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (failedKeys.has(key)) continue
        failedKeys.add(key)
        rowErrors.push({
          sheet: sheet.name,
          row: rowNumber,
          column: headerOf[key as K],
          message: issue.message,
        })
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      if (typeof input.code === 'string') rejectedCodes.push(input.code)
    } else if (validation.success) {
      parsed.push({ rowNumber, value: validation.data as T })
    }
  }
  return { rows: parsed, sheetRead: true, codes: rejectedCodes }
}

function isProblem(cell: CellValue | undefined): cell is { problem: string } {
  return typeof cell === 'object' && cell !== null
}

// --- Skjemaene for hver fane ---

/** Risikoer i filen: som appens skjema, men med navn i stedet for id-er. */
const riskRowSchema = riskInputSchema
  .pick({ code: true, title: true, description: true, type: true, likelihood: true, consequence: true })
  .extend({ owner: z.string(), theme: z.string(), area: z.string() })

const ratingConverter: Converter = interpretRating
const textOnly = (value: string | number) => ({ ok: true as const, value: String(value) })

const OWNERS: RowSchema<'code' | 'name' | 'email'> = { sheet: OWNER_SHEET, convert: {}, schema: ownerInputSchema }
const THEMES: RowSchema<'code' | 'name' | 'description'> = { sheet: THEME_SHEET, convert: {}, schema: themeInputSchema }
const AREAS: RowSchema<'code' | 'name' | 'description'> = { sheet: AREA_SHEET, convert: {}, schema: areaInputSchema }
const RISKS: RowSchema<keyof RiskRow> = {
  sheet: RISK_SHEET,
  convert: {
    type: (value) => interpretRiskType(String(value)),
    likelihood: ratingConverter,
    consequence: ratingConverter,
    owner: textOnly,
    theme: textOnly,
    area: textOnly,
  },
  schema: riskRowSchema,
}

/**
 * Første del av importen (T27): leser de fire fanene og hver rad for seg.
 * Sammenhengen mellom radene (unike navn, eier/tema/område som finnes)
 * kontrolleres i neste steg.
 */
export function parseSheets(workbook: WorkbookRows): ParsedSheets {
  const errors: CellError[] = []
  const risks = parseSheet<keyof RiskRow, RiskRow>(workbook, RISKS, errors)
  const owners = parseSheet<'code' | 'name' | 'email', OwnerInput>(workbook, OWNERS, errors)
  const themes = parseSheet<'code' | 'name' | 'description', ThemeInput>(workbook, THEMES, errors)
  const areas = parseSheet<'code' | 'name' | 'description', AreaInput>(workbook, AREAS, errors)
  const rejected = ({ sheetRead, codes }: RejectedRows): RejectedRows => ({ sheetRead, codes })
  return {
    risks: risks.rows,
    owners: owners.rows,
    themes: themes.rows,
    areas: areas.rows,
    errors,
    rejected: { owners: rejected(owners), themes: rejected(themes), areas: rejected(areas) },
  }
}

// --- Helheten (T28) ---

export type ExcelImportResult = { ok: true; data: AppData } | { ok: false; errors: CellError[] }

export interface ParseOptions {
  /** Tidspunktet som blir opprettet- og endret-dato. Standard: nå. */
  now?: Date
  /** Lager id-er. Standard: `crypto.randomUUID()`. */
  newId?: () => Id
}

/** «rad 5», «rad 5 og 7», «rad 5, 7 og 9». */
function rowList(rows: readonly number[]): string {
  const numbers = rows.map(String)
  const joined =
    numbers.length <= 1
      ? numbers.join('')
      : `${numbers.slice(0, -1).join(', ')} og ${numbers[numbers.length - 1]}`
  return `rad ${joined}`
}

/**
 * Like verdier i samme kolonne i en fane gir én feil per rad, med henvisning
 * til de andre (K29 for navn, spec 004 K53 for ID). Sammenlignes som navn.
 */
function findDuplicates<K extends string>(
  sheetName: string,
  rows: readonly ParsedRow<Record<K, string>>[],
  key: K,
  column: string,
  rule: string,
  errors: CellError[],
): void {
  const byValue = new Map<string, number[]>()
  for (const { rowNumber, value } of rows) {
    const normalized = normalizeName(value[key])
    byValue.set(normalized, [...(byValue.get(normalized) ?? []), rowNumber])
  }
  for (const { rowNumber, value } of rows) {
    const others = (byValue.get(normalizeName(value[key])) ?? []).filter((row) => row !== rowNumber)
    if (others.length > 0) {
      errors.push({
        sheet: sheetName,
        row: rowNumber,
        column,
        message: `«${value[key]}» står også på ${rowList(others)}. ${rule}`,
      })
    }
  }
}

const NAMES_UNIQUE = 'Navn må være unike.'
const CODES_UNIQUE = 'ID må være unik.'

const REFERENCES = [
  { key: 'owner', sheet: 'owners', column: 'Eier-ID', noun: 'eier', sheetName: OWNER_SHEET.name },
  { key: 'theme', sheet: 'themes', column: 'Tema-ID', noun: 'tema', sheetName: THEME_SHEET.name },
  { key: 'area', sheet: 'areas', column: 'Område-ID', noun: 'område', sheetName: AREA_SHEET.name },
] as const

/**
 * Tolker hele filen (spec 002, K26–K30): leser fanene, kontrollerer unike
 * navn og ID-er og at eier, tema og område i hver risiko finnes (slått opp
 * på ID, spec 005 K60), og bygger et nytt datasett. Én feil er nok til at
 * ingenting tas i bruk (K28).
 */
export function parseWorkbook(workbook: WorkbookRows, options: ParseOptions = {}): ExcelImportResult {
  const { now = new Date(), newId = () => crypto.randomUUID() } = options
  const sheets = parseSheets(workbook)
  const errors = [...sheets.errors]

  findDuplicates(RISK_SHEET.name, sheets.risks, 'code', 'ID', CODES_UNIQUE, errors)
  for (const [sheet, rows] of [
    [OWNER_SHEET.name, sheets.owners],
    [THEME_SHEET.name, sheets.themes],
    [AREA_SHEET.name, sheets.areas],
  ] as const) {
    findDuplicates(sheet, rows, 'code', 'ID', CODES_UNIQUE, errors)
    findDuplicates(sheet, rows, 'name', 'Navn', NAMES_UNIQUE, errors)
  }

  const owners: Owner[] = sheets.owners.map(({ value }) => ({ id: newId(), ...value }))
  const themes: Theme[] = sheets.themes.map(({ value }) => ({ id: newId(), ...value }))
  const areas: Area[] = sheets.areas.map(({ value }) => ({ id: newId(), ...value }))

  // Første forekomst vinner; like ID-er er allerede meldt som feil.
  const lookup = { owners, themes, areas }

  const timestamp = now.toISOString()
  const risks: Risk[] = []
  for (const { rowNumber, value } of sheets.risks) {
    const ids: Partial<Record<'owner' | 'theme' | 'area', Id>> = {}
    for (const reference of REFERENCES) {
      const code = value[reference.key]
      const found = findByCode<{ id: Id; code?: string }>(lookup[reference.sheet], code)
      if (found) {
        ids[reference.key] = found.id
        continue
      }
      // Følgefeil unngås: fanen ble ikke lest, eller raden med ID-en har egne feil.
      const rejected = sheets.rejected[reference.sheet]
      const explained =
        !rejected.sheetRead || rejected.codes.some((other) => normalizeName(other) === normalizeName(code))
      if (!explained) {
        errors.push({
          sheet: RISK_SHEET.name,
          row: rowNumber,
          column: reference.column,
          message: `Ingen ${reference.noun} har ID «${code}» i fanen «${reference.sheetName}»`,
        })
      }
    }
    if (ids.owner && ids.theme && ids.area) {
      const { owner: _owner, theme: _theme, area: _area, ...fields } = value
      risks.push({
        id: newId(),
        ...fields,
        ownerId: ids.owner,
        themeId: ids.theme,
        areaId: ids.area,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
  }

  const sheetOrder = DATA_SHEETS.map((sheet) => sheet.name)
  if (errors.length > 0) return { ok: false, errors: sortCellErrors(errors, sheetOrder) }

  // Sikkerhetsnett: samme kontroller som JSON-import og lesing fra lagring.
  const data = { schemaVersion: SCHEMA_VERSION, owners, themes, areas, risks }
  const checked = appDataSchema.safeParse(data)
  if (!checked.success) {
    return {
      ok: false,
      errors: checked.error.issues.map((issue) => ({
        sheet: 'Filen',
        message: `${issue.path.join('.')}: ${issue.message}`,
      })),
    }
  }
  const integrityErrors = findIntegrityErrors(checked.data)
  if (integrityErrors.length > 0) {
    return { ok: false, errors: integrityErrors.map((message) => ({ sheet: 'Filen', message })) }
  }
  return { ok: true, data: checked.data }
}
