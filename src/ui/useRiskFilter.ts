import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RiskFilter } from '../domain/filters.ts'
import type { RiskType } from '../domain/schema.ts'
import type { Level } from '../domain/scoring.ts'
import { useAppData } from '../state/dataContext.ts'

/**
 * Filtrene ligger i adressens søkeparametre (spec K4, K9; se plan), slik at
 * de deles av register og matrise, overlever sideoppdatering og kan bokmerkes.
 * Parameternavnene er norske for å gi lesbare adresser, f.eks.
 * «#/?eier=…&type=trussel&niva=3».
 */
const PARAM = {
  search: 'sok',
  type: 'type',
  ownerId: 'eier',
  themeId: 'tema',
  areaId: 'omrade',
  level: 'niva',
} as const satisfies Record<keyof RiskFilter, string>

const FILTER_PARAM_NAMES: readonly string[] = Object.values(PARAM)

/**
 * Bare filterdelen av en søkestreng, f.eks. «?eier=o2&niva=3». Brukes for å
 * la filtrene følge med når brukeren bytter mellom register og matrise (K9).
 */
export function filterSearch(search: string): string {
  const current = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const [name, value] of current) {
    if (FILTER_PARAM_NAMES.includes(name)) kept.append(name, value)
  }
  const text = kept.toString()
  return text ? `?${text}` : ''
}

const TYPE_TO_PARAM: Record<RiskType, string> = { threat: 'trussel', opportunity: 'mulighet' }
const PARAM_TO_TYPE: Record<string, RiskType> = { trussel: 'threat', mulighet: 'opportunity' }
const LEVEL_PARAMS: Record<string, Level> = { '1': 1, '2': 2, '3': 3 }

export interface RiskFilterState {
  filter: RiskFilter
  /** Endrer ett eller flere filtre. `undefined` fjerner filteret. */
  setFilter: (patch: Partial<RiskFilter>) => void
  reset: () => void
  /** Sant hvis minst ett filter er i bruk. */
  active: boolean
}

export function useRiskFilter(): RiskFilterState {
  const [params, setParams] = useSearchParams()
  const { owners, themes, areas } = useAppData()

  const filter = useMemo<RiskFilter>(() => {
    // Ukjente verdier ignoreres, f.eks. et bokmerke til en eier som er slettet,
    // slik at et utdatert filter ikke skjuler alt uten forklaring.
    const knownId = (value: string | null, items: readonly { id: string }[]) =>
      value !== null && items.some((item) => item.id === value) ? value : undefined

    const result: RiskFilter = {}
    const search = params.get(PARAM.search)
    if (search) result.search = search
    const type = PARAM_TO_TYPE[params.get(PARAM.type) ?? '']
    if (type) result.type = type
    const ownerId = knownId(params.get(PARAM.ownerId), owners)
    if (ownerId) result.ownerId = ownerId
    const themeId = knownId(params.get(PARAM.themeId), themes)
    if (themeId) result.themeId = themeId
    const areaId = knownId(params.get(PARAM.areaId), areas)
    if (areaId) result.areaId = areaId
    const level = LEVEL_PARAMS[params.get(PARAM.level) ?? '']
    if (level) result.level = level
    return result
  }, [params, owners, themes, areas])

  const setFilter = useCallback(
    (patch: Partial<RiskFilter>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch) as [keyof RiskFilter, unknown][]) {
            const name = PARAM[key]
            let text: string | undefined
            if (value === undefined || value === '') text = undefined
            else if (key === 'type') text = TYPE_TO_PARAM[value as RiskType]
            else text = String(value)
            if (text === undefined) next.delete(name)
            else next.set(name, text)
          }
          return next
        },
        // Erstatter i historikken, så tilbakeknappen ikke går gjennom hvert tastetrykk i søket.
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const name of Object.values(PARAM)) next.delete(name)
        return next
      },
      { replace: true },
    )
  }, [setParams])

  return { filter, setFilter, reset, active: Object.keys(filter).length > 0 }
}
