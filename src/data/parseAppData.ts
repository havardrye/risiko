import { findIntegrityErrors } from '../domain/rules.ts'
import { appDataSchema, SCHEMA_VERSION, type AppData } from '../domain/schema.ts'

export type ParseResult =
  | { ok: true; data: AppData }
  | { ok: false; message: string; details: string[] }

const MAX_DETAILS = 10

function fail(message: string, details: string[] = []): ParseResult {
  const shown = details.slice(0, MAX_DETAILS)
  if (details.length > MAX_DETAILS) {
    shown.push(`… og ${details.length - MAX_DETAILS} feil til.`)
  }
  return { ok: false, message, details: shown }
}

/**
 * Tolker og validerer et datasett fra tekst. Brukes både ved lesing fra
 * lagring og ved import (spec K20), slik at de to har samme krav.
 */
export function parseAppData(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return fail('Innholdet er ikke gyldig JSON.')
  }

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return fail('Innholdet er ikke et risikoregister.')
  }

  const version = (json as { schemaVersion?: unknown }).schemaVersion
  if (version !== SCHEMA_VERSION) {
    return fail(
      version === undefined
        ? 'Innholdet mangler versjonsnummer og er ikke et risikoregister.'
        : `Innholdet har versjon ${String(version)}, men appen støtter bare versjon ${SCHEMA_VERSION}.`,
    )
  }

  const parsed = appDataSchema.safeParse(json)
  if (!parsed.success) {
    return fail(
      'Innholdet har ugyldige felt.',
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(rot)'}: ${issue.message}`),
    )
  }

  const integrityErrors = findIntegrityErrors(parsed.data)
  if (integrityErrors.length > 0) {
    return fail('Innholdet henger ikke sammen.', integrityErrors)
  }

  return { ok: true, data: parsed.data }
}
