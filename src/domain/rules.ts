import type { AppData, Id, Risk } from './schema.ts'

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
 * Sjekker det skjemaet ikke kan se: at ID-er er unike, at navn er unike
 * innen hvert register, og at alle risikoer peker på elementer som finnes.
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
      if (seenIds.has(item.id)) errors.push(`Flere ${label}-oppføringer har ID «${item.id}».`)
      seenIds.add(item.id)

      const name = normalizeName(item.name)
      if (seenNames.has(name)) errors.push(`Navnet «${item.name}» er brukt flere ganger (${label}).`)
      seenNames.add(name)
    }

    const field = REFERENCE_FIELD[kind]
    for (const risk of data.risks) {
      if (!seenIds.has(risk[field])) {
        errors.push(`Risikoen «${risk.title}» viser til ${label} som ikke finnes.`)
      }
    }
  }

  const seenRiskIds = new Set<Id>()
  for (const risk of data.risks) {
    if (seenRiskIds.has(risk.id)) errors.push(`Flere risikoer har ID «${risk.id}».`)
    seenRiskIds.add(risk.id)
  }

  return errors
}
