import type { AppData } from '../../domain/schema.ts'
import { parseWorkbook } from './parseWorkbook.ts'
import { toWorkbookRows } from './toWorkbookRows.ts'

const CREATED = '2026-11-01T08:00:00.000Z'

function sample(): AppData {
  return {
    schemaVersion: 6,
    owners: [
      { id: 'o1', code: 'E-1', name: 'Kari Nordmann', email: 'kari@example.no' },
      { id: 'o2', code: 'E-2', name: 'Ola Nordmann' },
    ],
    themes: [
      { id: 't1', code: 'T-1', name: 'Leverandør', description: 'Innkjøp og avtaler'},
      { id: 't2', code: 'T-2', name: 'Informasjonssikkerhet'},
    ],
    areas: [
      { id: 'a1', code: 'O-1', name: 'IT' },
      { id: 'a2', code: 'O-2', name: 'Økonomi', description: 'Regnskap og lønn' },
    ],
    risks: [
      {
        id: 'r1',
        code: 'R-1',
        title: 'Leverandør går konkurs',
        description: 'Viktig leverandør',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 4,
        consequence: 5,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: 'r2',
        code: 'R-2',
        title: '=Ny avtale',
        type: 'opportunity',
        ownerId: 'o2',
        themeId: 't2',
        areaId: 'a2',
        likelihood: 1,
        consequence: 4,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  }
}

describe('toWorkbookRows (K35)', () => {
  it('har fanene og kolonnene fra formatet, med informasjonskolonnene til slutt i Risikoer', () => {
    const rows = toWorkbookRows(sample())
    expect(Object.keys(rows)).toEqual(['Risikoer', 'Eiere', 'Temaer', 'Områder'])
    expect(rows.Risikoer.headers).toEqual([
      'ID',
      'Tittel',
      'Beskrivelse',
      'Type',
      'Eier-ID',
      'Tema-ID',
      'Område-ID',
      'Sannsynlighet',
      'Konsekvens',
      'Score',
      'Nivå',
      'Eier',
      'Tema',
      'Område',
    ])
    expect(rows.Eiere.headers).toEqual(['ID', 'Navn', 'E-post'])
    expect(rows.Temaer.headers).toEqual(['ID', 'Navn', 'Beskrivelse'])
    expect(rows.Områder.headers).toEqual(['ID', 'Navn', 'Beskrivelse'])
  })

  it('skriver risikoer med ID-er, visningstekster, score, nivå og navnene bakerst', () => {
    expect(toWorkbookRows(sample()).Risikoer.rows).toEqual([
      {
        rowNumber: 2,
        cells: [
          'R-1',
          'Leverandør går konkurs',
          'Viktig leverandør',
          'Trussel',
          'E-1',
          'T-1',
          'O-1',
          4,
          5,
          20,
          'Høy',
          'Kari Nordmann',
          'Leverandør',
          'IT',
        ],
      },
      {
        rowNumber: 3,
        cells: [
          'R-2',
          '=Ny avtale',
          null,
          'Mulighet',
          'E-2',
          'T-2',
          'O-2',
          1,
          4,
          4,
          'Middels',
          'Ola Nordmann',
          'Informasjonssikkerhet',
          'Økonomi',
        ],
      },
    ])
  })

  it('skriver eiere, temaer og områder, med tomme celler for tomme valgfrie felt', () => {
    const rows = toWorkbookRows(sample())
    expect(rows.Eiere.rows.map((row) => row.cells)).toEqual([
      ['E-1', 'Kari Nordmann', 'kari@example.no'],
      ['E-2', 'Ola Nordmann', null],
    ])
    expect(rows.Temaer.rows.map((row) => row.cells)).toEqual([
      ['T-1', 'Leverandør', 'Innkjøp og avtaler'],
      ['T-2', 'Informasjonssikkerhet', null],
    ])
    expect(rows.Områder.rows.map((row) => row.cells)).toEqual([
      ['O-1', 'IT', null],
      ['O-2', 'Økonomi', 'Regnskap og lønn'],
    ])
  })

  it('gir tomme faner med overskrifter for et tomt datasett (malen, K33)', () => {
    const rows = toWorkbookRows({ schemaVersion: 6, owners: [], themes: [], areas: [], risks: [] })
    expect(rows.Områder).toEqual({ headers: ['ID', 'Navn', 'Beskrivelse'], rows: [] })
    expect(rows.Risikoer.rows).toEqual([])
  })

  it('gir de samme dataene tilbake når radene tolkes igjen, unntatt id-er og datoer', () => {
    const original = sample()
    const result = parseWorkbook(toWorkbookRows(original))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const withoutIds = (data: AppData) => ({
      owners: data.owners.map(({ id: _id, ...rest }) => rest),
      themes: data.themes.map(({ id: _id, ...rest }) => rest),
      areas: data.areas.map(({ id: _id, ...rest }) => rest),
      risks: data.risks.map(({ id: _id, createdAt: _c, updatedAt: _u, ownerId, themeId, areaId, ...rest }) => ({
        ...rest,
        owner: data.owners.find((owner) => owner.id === ownerId)?.name,
        theme: data.themes.find((theme) => theme.id === themeId)?.name,
        area: data.areas.find((area) => area.id === areaId)?.name,
      })),
    })
    expect(withoutIds(result.data)).toEqual(withoutIds(original))
  })
})

describe('ID i eksporten (spec 004, K51)', () => {
  it('skriver tom ID-celle for elementer fra før spec 004', () => {
    const data = sample()
    const { code: _code, ...legacy } = data.owners[1]!
    data.owners = [data.owners[0]!, legacy]
    expect(toWorkbookRows(data).Eiere.rows.map((row) => row.cells[0])).toEqual(['E-1', null])
  })
})
