import type { AppData } from '../../domain/schema.ts'
import { parseWorkbook } from './parseWorkbook.ts'
import { toWorkbookRows } from './toWorkbookRows.ts'

const CREATED = '2026-11-01T08:00:00.000Z'

function sample(): AppData {
  return {
    schemaVersion: 2,
    owners: [
      { id: 'o1', name: 'Kari Nordmann', email: 'kari@example.no' },
      { id: 'o2', name: 'Ola Nordmann' },
    ],
    themes: [
      { id: 't1', name: 'Leverandør', description: 'Innkjøp og avtaler' },
      { id: 't2', name: 'Informasjonssikkerhet' },
    ],
    areas: [
      { id: 'a1', name: 'IT', horizon: '0-3' },
      { id: 'a2', name: 'Økonomi', horizon: '5+', description: 'Regnskap og lønn' },
    ],
    risks: [
      {
        id: 'r1',
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
  it('har fanene og kolonnene fra formatet, med Score og Nivå til slutt i Risikoer', () => {
    const rows = toWorkbookRows(sample())
    expect(Object.keys(rows)).toEqual(['Risikoer', 'Eiere', 'Temaer', 'Områder'])
    expect(rows.Risikoer.headers).toEqual([
      'Tittel',
      'Beskrivelse',
      'Type',
      'Eier',
      'Tema',
      'Område',
      'Sannsynlighet',
      'Konsekvens',
      'Score',
      'Nivå',
    ])
    expect(rows.Eiere.headers).toEqual(['Navn', 'E-post'])
    expect(rows.Temaer.headers).toEqual(['Navn', 'Beskrivelse'])
    expect(rows.Områder.headers).toEqual(['Navn', 'Når?', 'Beskrivelse'])
  })

  it('skriver risikoer med navn, visningstekster, score og nivå', () => {
    expect(toWorkbookRows(sample()).Risikoer.rows).toEqual([
      {
        rowNumber: 2,
        cells: [
          'Leverandør går konkurs',
          'Viktig leverandør',
          'Trussel',
          'Kari Nordmann',
          'Leverandør',
          'IT',
          4,
          5,
          20,
          'Høy',
        ],
      },
      {
        rowNumber: 3,
        cells: ['=Ny avtale', null, 'Mulighet', 'Ola Nordmann', 'Informasjonssikkerhet', 'Økonomi', 1, 4, 4, 'Middels'],
      },
    ])
  })

  it('skriver eiere, temaer og områder, med tomme celler for tomme valgfrie felt', () => {
    const rows = toWorkbookRows(sample())
    expect(rows.Eiere.rows.map((row) => row.cells)).toEqual([
      ['Kari Nordmann', 'kari@example.no'],
      ['Ola Nordmann', null],
    ])
    expect(rows.Temaer.rows.map((row) => row.cells)).toEqual([
      ['Leverandør', 'Innkjøp og avtaler'],
      ['Informasjonssikkerhet', null],
    ])
    expect(rows.Områder.rows.map((row) => row.cells)).toEqual([
      ['IT', '0 - 3 år', null],
      ['Økonomi', '5 år +', 'Regnskap og lønn'],
    ])
  })

  it('gir tomme faner med overskrifter for et tomt datasett (malen, K33)', () => {
    const rows = toWorkbookRows({ schemaVersion: 2, owners: [], themes: [], areas: [], risks: [] })
    expect(rows.Områder).toEqual({ headers: ['Navn', 'Når?', 'Beskrivelse'], rows: [] })
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
