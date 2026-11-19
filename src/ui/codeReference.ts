import { findByCode } from '../domain/rules.ts'
import type { Id } from '../domain/schema.ts'
import type { CodeOption } from './codeSuggestions.ts'

/**
 * Felt der en kobling angis med ID (spec 005, K57–K59; spec 006, K63–K65):
 * hva feltet viser når skjemaet åpnes, og hva teksten betyr ved lagring.
 * Brukes av risikoskjemaet og temaskjemaet.
 */

/** Merknaden etter navnet når elementet mangler ID (K59, K65). */
export const MISSING_CODE_SUFFIX = ' (mangler ID)'

/** Teksten i feltet og om brukeren har endret den. */
export interface ReferenceText {
  text: string
  edited: boolean
}

/**
 * Det feltet viser når skjemaet åpnes: ID-en til elementet det er koblet til,
 * «Navn (mangler ID)» når elementet ikke har ID, eller tomt.
 */
export function initialReferenceText(items: readonly CodeOption[], linkedId: Id | undefined): ReferenceText {
  const item = linkedId === undefined ? undefined : items.find((candidate) => candidate.id === linkedId)
  if (!item) return { text: '', edited: false }
  return { text: item.code ?? `${item.name}${MISSING_CODE_SUFFIX}`, edited: false }
}

/** Sant når feltet fortsatt viser «Navn (mangler ID)» (teksten markeres da ved fokus). */
export function showsMissingCode(value: ReferenceText): boolean {
  return !value.edited && value.text.endsWith(MISSING_CODE_SUFFIX)
}

/**
 * Gjør teksten om til intern id. Er feltet uendret og elementet det er koblet
 * til, mangler ID, beholdes koblingen (K59, K65). Gir id-en eller feilmeldingen
 * som skal vises ved feltet, f.eks. «Ingen risikoeier har ID «E-9».».
 */
export function resolveReferenceText(
  items: readonly CodeOption[],
  value: ReferenceText,
  linkedId: Id | undefined,
  { label, noun }: { label: string; noun: string },
): { id: Id } | { error: string } {
  if (linkedId !== undefined && !value.edited) {
    const current = items.find((item) => item.id === linkedId)
    if (current && current.code === undefined) return { id: current.id }
  }
  const text = value.text.trim()
  if (text === '') return { error: `${label} er påkrevd` }
  const found = findByCode(items, text)
  return found ? { id: found.id } : { error: `Ingen ${noun} har ID «${text}».` }
}
