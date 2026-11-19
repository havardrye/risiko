import { SCHEMA_VERSION } from '../domain/schema.ts'

/**
 * Løfter rådata fra eldre versjoner til gjeldende versjon, før validering.
 * Brukes både ved lesing fra lagring og ved import (se plan: Migrering).
 * Endrer ikke det som sendes inn.
 */

type Raw = Record<string, unknown>

/** Standardverdien versjon 2 ga «Når?» (beslutning 7 i 001). Fjernes igjen i 4 → 5. */
const DEFAULT_HORIZON = '0-3'

/** Versjon 1 → 2: områder får «Når?» (K25). Mangler feltet, settes standardverdien. */
function from1to2(data: Raw): Raw {
  const areas = Array.isArray(data.areas)
    ? data.areas.map((area: unknown) =>
        typeof area === 'object' && area !== null && !('horizon' in area)
          ? { ...area, horizon: DEFAULT_HORIZON }
          : area,
      )
    : data.areas
  return { ...data, schemaVersion: 2, areas }
}

/**
 * Versjon 2 → 3: brukerens ID (`code`, spec 004). Feltet er valgfritt, så
 * dataene endres ikke (beslutning 5). Versjonen løftes likevel, slik at en
 * eldre utgave av appen avviser data med ID i stedet for å fjerne ID-ene.
 */
function from2to3(data: Raw): Raw {
  return { ...data, schemaVersion: 3 }
}

/**
 * Versjon 3 → 4: område på tema (`areaId`, spec 006). Feltet er valgfritt i
 * lagrede data, så dataene endres ikke (K64). Versjonen løftes av samme grunn
 * som i 2 → 3: en eldre app skal avvise dataene, ikke fjerne feltet.
 */
function from3to4(data: Raw): Raw {
  return { ...data, schemaVersion: 4 }
}

/**
 * Versjon 4 → 5: «Når?» er fjernet fra områder (spec 007, K73). Verdiene
 * slettes (beslutning 1), så de heller ikke skrives tilbake ved neste lagring.
 */
function from4to5(data: Raw): Raw {
  const areas = Array.isArray(data.areas)
    ? data.areas.map((area: unknown) => {
        if (typeof area !== 'object' || area === null || !('horizon' in area)) return area
        const { horizon: _horizon, ...rest } = area as Record<string, unknown>
        return rest
      })
    : data.areas
  return { ...data, schemaVersion: 5, areas }
}

const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  1: from1to2,
  2: from2to3,
  3: from3to4,
  4: from4to5,
}

/** Versjonene appen kan lese: alle med migrering, pluss gjeldende. */
export const SUPPORTED_VERSIONS: readonly number[] = [
  ...Object.keys(MIGRATIONS).map(Number),
  SCHEMA_VERSION,
]

export function migrate(data: Raw): Raw {
  let current = data
  while (
    typeof current.schemaVersion === 'number' &&
    current.schemaVersion < SCHEMA_VERSION &&
    MIGRATIONS[current.schemaVersion]
  ) {
    current = MIGRATIONS[current.schemaVersion]!(current)
  }
  return current
}
