import { DEFAULT_HORIZON } from '../domain/scales.ts'
import { SCHEMA_VERSION } from '../domain/schema.ts'

/**
 * Løfter rådata fra eldre versjoner til gjeldende versjon, før validering.
 * Brukes både ved lesing fra lagring og ved import (se plan: Migrering).
 * Endrer ikke det som sendes inn.
 */

type Raw = Record<string, unknown>

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

const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  1: from1to2,
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
