import { normalizeName } from './rules.ts'
import { RISK_TYPE_LABELS, RISK_TYPES } from './scales.ts'

/**
 * Excel-formatet (spec 002, K26, K33, K35): faner, kolonner og faste verdier.
 * Import, eksport, mal og veiledning leser alle herfra, så de holder seg like.
 * Rene data og funksjoner; ingenting her vet om ExcelJS eller filer.
 */

/** Lovlige verdier i kolonnene som har faste valg (nedtrekkslister i malen). */
export const RISK_TYPE_CHOICES: readonly string[] = RISK_TYPES.map((type) => RISK_TYPE_LABELS[type])
export const RATING_CHOICES: readonly string[] = ['1', '2', '3', '4', '5']

export interface ColumnSpec<K extends string = string> {
  /** Feltet kolonnen fylles fra og tolkes til. */
  key: K
  /** Overskriften på rad 1, slik den skrives i malen og eksporten. */
  header: string
  required: boolean
  /** Faste valg; gir nedtrekksliste i malen og kontrolleres ved import. */
  choices?: readonly string[]
  /** Kolonnebredde i Excel (antall tegn). */
  width: number
}

export interface SheetSpec<K extends string = string> {
  /** Fanenavnet, slik det skrives i malen og eksporten. */
  name: string
  columns: readonly ColumnSpec<K>[]
}

/** Brukerens ID, først i alle faner (spec 004, K51). */
const CODE_COLUMN = { key: 'code', header: 'ID', required: true, width: 12 } as const

export const OWNER_SHEET: SheetSpec<'code' | 'name' | 'email'> = {
  name: 'Eiere',
  columns: [
    CODE_COLUMN,
    { key: 'name', header: 'Navn', required: true, width: 30 },
    { key: 'email', header: 'E-post', required: false, width: 34 },
  ],
}

export const THEME_SHEET: SheetSpec<'code' | 'name' | 'description'> = {
  name: 'Temaer',
  columns: [
    CODE_COLUMN,
    { key: 'name', header: 'Navn', required: true, width: 30 },
    { key: 'description', header: 'Beskrivelse', required: false, width: 60 },
  ],
}

export const AREA_SHEET: SheetSpec<'code' | 'name' | 'description'> = {
  name: 'Områder',
  columns: [
    CODE_COLUMN,
    { key: 'name', header: 'Navn', required: true, width: 30 },
    { key: 'description', header: 'Beskrivelse', required: false, width: 60 },
  ],
}

export type RiskColumnKey =
  | 'code'
  | 'title'
  | 'description'
  | 'type'
  | 'owner'
  | 'theme'
  | 'area'
  | 'likelihood'
  | 'consequence'

export const RISK_SHEET: SheetSpec<RiskColumnKey> = {
  name: 'Risikoer',
  columns: [
    CODE_COLUMN,
    { key: 'title', header: 'Tittel', required: true, width: 40 },
    { key: 'description', header: 'Beskrivelse', required: false, width: 60 },
    { key: 'type', header: 'Type', required: true, choices: RISK_TYPE_CHOICES, width: 12 },
    // Eier, tema og område angis med ID (spec 005, K60). Navnene står som informasjon bakerst.
    { key: 'owner', header: 'Eier-ID', required: true, width: 12 },
    { key: 'theme', header: 'Tema-ID', required: true, width: 12 },
    { key: 'area', header: 'Område-ID', required: true, width: 12 },
    { key: 'likelihood', header: 'Sannsynlighet', required: true, choices: RATING_CHOICES, width: 14 },
    { key: 'consequence', header: 'Konsekvens', required: true, choices: RATING_CHOICES, width: 14 },
  ],
}

/**
 * Kolonner som bare skrives ved eksport, til informasjon (K35). Importen
 * kjenner dem ikke og ignorerer dem derfor, som andre ukjente kolonner (K26).
 */
export const RISK_INFO_COLUMNS: readonly ColumnSpec<'score' | 'level' | 'ownerName' | 'themeName' | 'areaName'>[] = [
  { key: 'score', header: 'Score', required: false, width: 8 },
  { key: 'level', header: 'Nivå', required: false, width: 12 },
  // Navnene til ID-ene i Eier-ID, Tema-ID og Område-ID (spec 005, K61).
  { key: 'ownerName', header: 'Eier', required: false, width: 24 },
  { key: 'themeName', header: 'Tema', required: false, width: 24 },
  { key: 'areaName', header: 'Område', required: false, width: 24 },
]

/** Informasjonskolonnene per fane, etter de vanlige kolonnene. Bare Risikoer har slike. */
export const INFO_COLUMNS: Readonly<Record<string, readonly ColumnSpec[]>> = {
  Risikoer: RISK_INFO_COLUMNS,
}

/** Fanen med veiledning først i malen og eksporten (K33). Ignoreres ved import. */
export const GUIDE_SHEET_NAME = 'Veiledning'

/** Datafanene i den rekkefølgen de står i filen. */
export const DATA_SHEETS = [RISK_SHEET, OWNER_SHEET, THEME_SHEET, AREA_SHEET] as const

// --- Oppslag i filen ---

/**
 * Fane- og kolonnenavn sammenlignes uten hensyn til store/små bokstaver og
 * mellomrom (K26), etter samme regel som navn på eiere, temaer og områder.
 */
export function normalizeHeader(text: string): string {
  return normalizeName(text)
}

/** Finner fanen med gitt navn blant fanenavnene i filen, eller undefined. */
export function findSheetName(sheetNames: readonly string[], wanted: string): string | undefined {
  const target = normalizeHeader(wanted)
  return sheetNames.find((name) => normalizeHeader(name) === target)
}

export interface ColumnLookup<K extends string> {
  /** Kolonneindeks (0-basert) for hver kolonne som ble funnet. */
  indexes: Partial<Record<K, number>>
  /** Påkrevde kolonner som mangler. */
  missing: ColumnSpec<K>[]
  /** Kolonner som står mer enn én gang, så det er uklart hvilken som gjelder. */
  duplicates: ColumnSpec<K>[]
}

/** Finner kolonnene i en fane ut fra overskriftene på rad 1. Ukjente overskrifter ignoreres. */
export function findColumns<K extends string>(
  headers: readonly string[],
  sheet: SheetSpec<K>,
): ColumnLookup<K> {
  const normalized = headers.map(normalizeHeader)
  const lookup: ColumnLookup<K> = { indexes: {}, missing: [], duplicates: [] }

  for (const column of sheet.columns) {
    const target = normalizeHeader(column.header)
    const matches = normalized.flatMap((header, index) => (header === target ? [index] : []))
    if (matches.length === 0) {
      if (column.required) lookup.missing.push(column)
    } else if (matches.length > 1) {
      lookup.duplicates.push(column)
    } else {
      lookup.indexes[column.key] = matches[0]
    }
  }
  return lookup
}
