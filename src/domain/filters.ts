import type { Id, Risk, RiskType } from './schema.ts'
import { level, score, type Level } from './scoring.ts'

/** Filtre som deles av register og matrise (spec K4, K9). Utelatt felt betyr «alle». */
export interface RiskFilter {
  /** Fritekst som må finnes i ID, tittel eller beskrivelse (K4, spec 004 K55). */
  search?: string
  type?: RiskType
  ownerId?: Id
  themeId?: Id
  areaId?: Id
  level?: Level
}

export type SortKey = 'code' | 'score' | 'title' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export interface RiskSort {
  key: SortKey
  direction: SortDirection
}

/** Standard: høyest score først. */
export const DEFAULT_SORT: RiskSort = { key: 'score', direction: 'desc' }

const LOCALE = 'nb'

function matchesSearch(risk: Risk, search: string): boolean {
  const needle = search.trim().toLocaleLowerCase(LOCALE)
  if (needle === '') return true
  const haystack = `${risk.code ?? ''}\n${risk.title}\n${risk.description ?? ''}`.toLocaleLowerCase(LOCALE)
  return haystack.includes(needle)
}

export function filterRisks(risks: readonly Risk[], filter: RiskFilter): Risk[] {
  return risks.filter(
    (risk) =>
      (filter.search === undefined || matchesSearch(risk, filter.search)) &&
      (filter.type === undefined || risk.type === filter.type) &&
      (filter.ownerId === undefined || risk.ownerId === filter.ownerId) &&
      (filter.themeId === undefined || risk.themeId === filter.themeId) &&
      (filter.areaId === undefined || risk.areaId === filter.areaId) &&
      (filter.level === undefined || level(risk.likelihood, risk.consequence) === filter.level),
  )
}

// Tar hensyn til tall, så «R-2» kommer før «R-10» (spec 004, K55).
const NATURAL = new Intl.Collator(LOCALE, { sensitivity: 'base', numeric: true })

function compareTitle(a: Risk, b: Risk): number {
  return NATURAL.compare(a.title, b.title)
}

const COMPARATORS: Record<SortKey, (a: Risk, b: Risk) => number> = {
  code: (a, b) => NATURAL.compare(a.code ?? '', b.code ?? ''),
  score: (a, b) => score(a.likelihood, a.consequence) - score(b.likelihood, b.consequence),
  title: compareTitle,
  // ISO 8601-datoer i UTC kan sammenlignes som tekst.
  updatedAt: (a, b) => (a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0),
}

/**
 * Returnerer en sortert kopi. Like verdier sorteres på tittel (stigende),
 * slik at rekkefølgen er forutsigbar uansett retning.
 */
export function sortRisks(risks: readonly Risk[], sort: RiskSort = DEFAULT_SORT): Risk[] {
  const compare = COMPARATORS[sort.key]
  const factor = sort.direction === 'asc' ? 1 : -1
  const sorted = [...risks].sort((a, b) => factor * compare(a, b) || compareTitle(a, b))
  if (sort.key !== 'code') return sorted
  // Risikoer uten ID (fra før spec 004) står sist i begge retninger.
  return [...sorted.filter((risk) => risk.code), ...sorted.filter((risk) => !risk.code)]
}
