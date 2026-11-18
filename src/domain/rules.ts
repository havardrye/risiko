import type { AppData, Area, Id, Owner, Risk, Theme } from './schema.ts'

/**
 * Regler som gjelder på tvers av elementer (spec K12, K13, K15–K18, K20).
 * Rene funksjoner: de sjekker, men endrer ingenting.
 */

/** Referanseregistrene en risiko peker til. */
export type ReferenceKind = 'owner' | 'theme' | 'area'

const REFERENCE_FIELD = {
  owner: 'ownerId',
  theme: 'themeId',
  area: 'areaId',
} as const satisfies Record<ReferenceKind, keyof Risk>

/** Hvilken liste i datasettet hvert register ligger i. */
export const REFERENCE_LIST = {
  owner: 'owners',
  theme: 'themes',
  area: 'areas',
} as const satisfies Record<ReferenceKind, keyof AppData>

const REFERENCE_LABEL: Record<ReferenceKind, string> = {
  owner: 'risikoeier',
  theme: 'tema',
  area: 'område',
}

const REFERENCE_KINDS: readonly ReferenceKind[] = ['owner', 'theme', 'area']

// --- Unike navn (K12, K15, K17) ---

/** Navn sammenlignes uten hensyn til store/små bokstaver og overflødige mellomrom. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('nb')
}

/**
 * Sant hvis et annet element allerede har navnet.
 * `excludeId` er elementet som redigeres, slik at det ikke kolliderer med seg selv.
 */
export function isNameTaken(
  items: readonly { id: Id; name: string }[],
  name: string,
  excludeId?: Id,
): boolean {
  const wanted = normalizeName(name)
  return items.some((item) => item.id !== excludeId && normalizeName(item.name) === wanted)
}

// --- Egne ID-er (spec 004, K48, K54) ---

/**
 * Sant hvis et annet element av samme type allerede har ID-en. Samme regel
 * som for navn: store/små bokstaver og overflødige mellomrom teller ikke.
 * Elementer uten ID (fra før spec 004) kolliderer aldri.
 */
export function isCodeTaken(
  items: readonly { id: Id; code?: string }[],
  code: string,
  excludeId?: Id,
): boolean {
  const wanted = normalizeName(code)
  return items.some(
    (item) => item.id !== excludeId && item.code !== undefined && normalizeName(item.code) === wanted,
  )
}

/** Elementene som mangler ID, per type (K54). */
export interface MissingCodes {
  risks: Risk[]
  owners: Owner[]
  themes: Theme[]
  areas: Area[]
}

const hasNoCode = (item: { code?: string }) => item.code === undefined || item.code.trim() === ''

export function findMissingCodes(data: AppData): MissingCodes {
  return {
    risks: data.risks.filter(hasNoCode),
    owners: data.owners.filter(hasNoCode),
    themes: data.themes.filter(hasNoCode),
    areas: data.areas.filter(hasNoCode),
  }
}

/** Antall elementer uten ID i alt. */
export function countMissingCodes(missing: MissingCodes): number {
  return missing.risks.length + missing.owners.length + missing.themes.length + missing.areas.length
}

/** Like ID-er innen én type gir én melding per ID som går igjen. */
function duplicateCodeErrors(items: readonly { code?: string }[], label: string): string[] {
  const seen = new Set<string>()
  const reported = new Set<string>()
  const errors: string[] = []
  for (const { code } of items) {
    if (code === undefined) continue
    const key = normalizeName(code)
    if (seen.has(key) && !reported.has(key)) {
      errors.push(`ID-en «${code}» er brukt flere ganger (${label}).`)
      reported.add(key)
    }
    seen.add(key)
  }
  return errors
}

// --- Slettesperre (K13, K16, K18) ---

/** Risikoene som bruker elementet. Tom liste betyr at det kan slettes. */
export function risksReferencing(risks: readonly Risk[], kind: ReferenceKind, id: Id): Risk[] {
  const field = REFERENCE_FIELD[kind]
  return risks.filter((risk) => risk[field] === id)
}

/** Antall risikoer per element, til listene i registrene (K14, K16, K18). */
export function countRisksBy(risks: readonly Risk[], kind: ReferenceKind): Map<Id, number> {
  const field = REFERENCE_FIELD[kind]
  const counts = new Map<Id, number>()
  for (const risk of risks) {
    counts.set(risk[field], (counts.get(risk[field]) ?? 0) + 1)
  }
  return counts
}

// --- Dataintegritet (K20, og ved lesing fra lagring) ---

/**
 * Sjekker det skjemaet ikke kan se: at interne id-er er unike, at navn og
 * brukerens ID-er er unike innen hvert register, og at alle risikoer peker
 * på elementer som finnes.
 * Returnerer feilmeldinger på norsk; tom liste betyr at dataene henger sammen.
 */
export function findIntegrityErrors(data: AppData): string[] {
  const errors: string[] = []

  for (const kind of REFERENCE_KINDS) {
    const items = data[REFERENCE_LIST[kind]]
    const label = REFERENCE_LABEL[kind]

    const seenIds = new Set<Id>()
    const seenNames = new Set<string>()
    for (const item of items) {
      if (seenIds.has(item.id)) errors.push(`Flere ${label}-oppføringer har intern id «${item.id}».`)
      seenIds.add(item.id)

      const name = normalizeName(item.name)
      if (seenNames.has(name)) errors.push(`Navnet «${item.name}» er brukt flere ganger (${label}).`)
      seenNames.add(name)
    }
    errors.push(...duplicateCodeErrors(items, label))

    const field = REFERENCE_FIELD[kind]
    for (const risk of data.risks) {
      if (!seenIds.has(risk[field])) {
        errors.push(`Risikoen «${risk.title}» viser til ${label} som ikke finnes.`)
      }
    }
  }

  const seenRiskIds = new Set<Id>()
  for (const risk of data.risks) {
    if (seenRiskIds.has(risk.id)) errors.push(`Flere risikoer har intern id «${risk.id}».`)
    seenRiskIds.add(risk.id)
  }
  errors.push(...duplicateCodeErrors(data.risks, 'risiko'))

  return errors
}
