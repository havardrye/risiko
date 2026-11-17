import { DEFAULT_SORT, filterRisks, sortRisks } from './filters.ts'
import type { Risk } from './schema.ts'

function risk(overrides: Partial<Risk> & Pick<Risk, 'id'>): Risk {
  return {
    title: `Risiko ${overrides.id}`,
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 1,
    consequence: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const risks: Risk[] = [
  risk({
    id: 'r1',
    title: 'Leverandør går konkurs',
    description: 'Kritisk underleverandør av drift',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 2,
    consequence: 5, // score 10, nivå 2
    updatedAt: '2026-03-01T00:00:00.000Z',
  }),
  risk({
    id: 'r2',
    title: 'Datainnbrudd',
    ownerId: 'o2',
    themeId: 't2',
    areaId: 'a1',
    likelihood: 4,
    consequence: 5, // score 20, nivå 3
    updatedAt: '2026-02-01T00:00:00.000Z',
  }),
  risk({
    id: 'r3',
    title: 'Ny støtteordning',
    description: 'Mulig ekstern finansiering',
    type: 'opportunity',
    ownerId: 'o1',
    themeId: 't2',
    areaId: 'a2',
    likelihood: 1,
    consequence: 2, // score 2, nivå 1
    updatedAt: '2026-04-01T00:00:00.000Z',
  }),
  risk({
    id: 'r4',
    title: 'Ærlig tilbakemelding uteblir',
    ownerId: 'o2',
    themeId: 't1',
    areaId: 'a2',
    likelihood: 1,
    consequence: 4, // score 4, men nivå 2 (unntaket i K10)
    updatedAt: '2026-01-15T00:00:00.000Z',
  }),
]

const ids = (list: Risk[]) => list.map((r) => r.id)

describe('filterRisks', () => {
  it('returnerer alle uten filter', () => {
    expect(ids(filterRisks(risks, {}))).toEqual(['r1', 'r2', 'r3', 'r4'])
  })

  it('filtrerer på eier', () => {
    expect(ids(filterRisks(risks, { ownerId: 'o1' }))).toEqual(['r1', 'r3'])
  })

  it('filtrerer på tema', () => {
    expect(ids(filterRisks(risks, { themeId: 't2' }))).toEqual(['r2', 'r3'])
  })

  it('filtrerer på område', () => {
    expect(ids(filterRisks(risks, { areaId: 'a2' }))).toEqual(['r3', 'r4'])
  })

  it('filtrerer på type', () => {
    expect(ids(filterRisks(risks, { type: 'opportunity' }))).toEqual(['r3'])
    expect(ids(filterRisks(risks, { type: 'threat' }))).toEqual(['r1', 'r2', 'r4'])
  })

  it('filtrerer på nivå fra matrisen, ikke fra score', () => {
    expect(ids(filterRisks(risks, { level: 1 }))).toEqual(['r3'])
    expect(ids(filterRisks(risks, { level: 2 }))).toEqual(['r1', 'r4'])
    expect(ids(filterRisks(risks, { level: 3 }))).toEqual(['r2'])
  })

  it('søker i tittel uten hensyn til store og små bokstaver', () => {
    expect(ids(filterRisks(risks, { search: 'DATA' }))).toEqual(['r2'])
  })

  it('søker i beskrivelse', () => {
    expect(ids(filterRisks(risks, { search: 'finansiering' }))).toEqual(['r3'])
  })

  it('håndterer æ, ø og å i søk', () => {
    expect(ids(filterRisks(risks, { search: 'ærlig' }))).toEqual(['r4'])
    expect(ids(filterRisks(risks, { search: 'LEVERANDØR' }))).toEqual(['r1'])
  })

  it('ser bort fra mellomrom rundt søketeksten, og tomt søk gir alle', () => {
    expect(ids(filterRisks(risks, { search: '  konkurs ' }))).toEqual(['r1'])
    expect(filterRisks(risks, { search: '   ' })).toHaveLength(4)
  })

  it('kombinerer filtre med «og»', () => {
    expect(ids(filterRisks(risks, { ownerId: 'o2', themeId: 't1' }))).toEqual(['r4'])
    expect(ids(filterRisks(risks, { areaId: 'a1', level: 3, search: 'inn' }))).toEqual(['r2'])
    expect(filterRisks(risks, { ownerId: 'o1', type: 'threat', areaId: 'a2' })).toEqual([])
  })

  it('gir tom liste når ingenting treffer', () => {
    expect(filterRisks(risks, { search: 'finnes ikke' })).toEqual([])
  })
})

describe('sortRisks', () => {
  it('sorterer på høyest score som standard', () => {
    expect(DEFAULT_SORT).toEqual({ key: 'score', direction: 'desc' })
    expect(ids(sortRisks(risks))).toEqual(['r2', 'r1', 'r4', 'r3'])
  })

  it('sorterer på score stigende', () => {
    expect(ids(sortRisks(risks, { key: 'score', direction: 'asc' }))).toEqual([
      'r3',
      'r4',
      'r1',
      'r2',
    ])
  })

  it('sorterer på tittel etter norsk alfabet, med Æ etter Z', () => {
    expect(ids(sortRisks(risks, { key: 'title', direction: 'asc' }))).toEqual([
      'r2',
      'r1',
      'r3',
      'r4',
    ])
    expect(ids(sortRisks(risks, { key: 'title', direction: 'desc' }))).toEqual([
      'r4',
      'r3',
      'r1',
      'r2',
    ])
  })

  it('sorterer på sist endret', () => {
    expect(ids(sortRisks(risks, { key: 'updatedAt', direction: 'desc' }))).toEqual([
      'r3',
      'r1',
      'r2',
      'r4',
    ])
    expect(ids(sortRisks(risks, { key: 'updatedAt', direction: 'asc' }))).toEqual([
      'r4',
      'r2',
      'r1',
      'r3',
    ])
  })

  it('sorterer like verdier på tittel, uansett retning', () => {
    const tied = [
      risk({ id: 'b', title: 'Bravo', likelihood: 2, consequence: 2 }),
      risk({ id: 'a', title: 'Alfa', likelihood: 4, consequence: 1 }),
      risk({ id: 'c', title: 'Charlie', likelihood: 1, consequence: 4 }),
    ]
    expect(ids(sortRisks(tied, { key: 'score', direction: 'desc' }))).toEqual(['a', 'b', 'c'])
    expect(ids(sortRisks(tied, { key: 'score', direction: 'asc' }))).toEqual(['a', 'b', 'c'])
  })

  it('endrer ikke den opprinnelige listen', () => {
    const before = ids(risks)
    sortRisks(risks, { key: 'title', direction: 'asc' })
    expect(ids(risks)).toEqual(before)
  })
})
