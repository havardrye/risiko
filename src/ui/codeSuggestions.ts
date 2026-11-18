import type { Id } from '../domain/schema.ts'

/** Et element som kan velges med ID: eier, tema eller område. */
export interface CodeOption {
  id: Id
  code?: string | undefined
  name: string
}

/** Høyst så mange forslag vises om gangen (plan 005). */
export const MAX_SUGGESTIONS = 8

const NATURAL = new Intl.Collator('nb', { sensitivity: 'base', numeric: true })

/** Forslagene som passer teksten: ID eller navn inneholder den. Bare elementer med ID. */
export function suggestionsFor(options: readonly CodeOption[], text: string): CodeOption[] {
  const query = text.trim().toLocaleLowerCase('nb')
  return options
    .filter((option): option is CodeOption & { code: string } => Boolean(option.code))
    .filter(
      (option) =>
        query === '' ||
        option.code.toLocaleLowerCase('nb').includes(query) ||
        option.name.toLocaleLowerCase('nb').includes(query),
    )
    .sort((a, b) => NATURAL.compare(a.code ?? '', b.code ?? ''))
    .slice(0, MAX_SUGGESTIONS)
}
