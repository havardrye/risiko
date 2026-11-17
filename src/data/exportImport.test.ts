import { emptyAppData, type AppData } from '../domain/schema.ts'
import { exportFileName, parseImportFile, serializeAppData, summarize } from './exportImport.ts'

function sampleData(): AppData {
  return {
    schemaVersion: 1,
    owners: [
      { id: 'o1', name: 'Kari Nordmann', email: 'kari@example.com' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'Økonomi', description: 'Regnskap og lønn' }],
    risks: [
      {
        id: 'r1',
        title: 'Leverandør går konkurs',
        description: 'Kritisk underleverandør',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 2,
        consequence: 5,
        createdAt: '2026-11-17T20:00:00.000Z',
        updatedAt: '2026-11-17T20:00:00.000Z',
      },
      {
        id: 'r2',
        title: 'Ny støtteordning',
        type: 'opportunity',
        ownerId: 'o2',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 3,
        consequence: 4,
        createdAt: '2026-11-17T20:00:00.000Z',
        updatedAt: '2026-11-17T21:00:00.000Z',
      },
    ],
  }
}

describe('summarize', () => {
  it('teller elementene i datasettet', () => {
    expect(summarize(sampleData())).toEqual({ risks: 2, owners: 2, themes: 1, areas: 1 })
    expect(summarize(emptyAppData())).toEqual({ risks: 0, owners: 0, themes: 0, areas: 0 })
  })
})

describe('exportFileName', () => {
  it('inneholder lokal dato med ledende nuller', () => {
    expect(exportFileName(new Date(2026, 10, 17, 21, 30))).toBe('risikoregister-2026-11-17.json')
    expect(exportFileName(new Date(2027, 0, 5))).toBe('risikoregister-2027-01-05.json')
  })

  it('bruker lokal dato også rett før midnatt', () => {
    expect(exportFileName(new Date(2026, 11, 31, 23, 59))).toBe('risikoregister-2026-12-31.json')
  })
})

describe('eksport og import', () => {
  it('gir samme data tilbake etter eksport og import', () => {
    const result = parseImportFile(serializeAppData(sampleData()))
    expect(result).toEqual({ ok: true, data: sampleData() })
  })

  it('bevarer æ, ø og å', () => {
    const text = serializeAppData(sampleData())
    expect(text).toContain('Ola Åsen')
    expect(text).toContain('Økonomi')
  })

  it('eksporterer lesbar JSON med versjonsnummer', () => {
    const text = serializeAppData(emptyAppData())
    expect(text).toContain('\n  "schemaVersion": 1,')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('godtar et tomt datasett', () => {
    expect(parseImportFile(serializeAppData(emptyAppData())).ok).toBe(true)
  })
})

describe('parseImportFile avviser', () => {
  function rejected(text: string) {
    const result = parseImportFile(text)
    if (result.ok) throw new Error('Forventet at filen ble avvist')
    return result
  }

  it('tom fil', () => {
    expect(rejected('  \n').message).toBe('Filen er tom.')
  })

  it('fil som ikke er JSON', () => {
    expect(rejected('Tittel;Eier;Score\nBrann;Kari;10').message).toBe(
      'Innholdet er ikke gyldig JSON.',
    )
  })

  it('JSON som ikke er et risikoregister', () => {
    expect(rejected('{"name":"noe annet"}').message).toBe(
      'Innholdet mangler versjonsnummer og er ikke et risikoregister.',
    )
    expect(rejected('"tekst"').message).toBe('Innholdet er ikke et risikoregister.')
  })

  it('fil fra en nyere versjon', () => {
    const text = JSON.stringify({ ...sampleData(), schemaVersion: 2 })
    expect(rejected(text).message).toBe('Innholdet har versjon 2, men appen støtter bare versjon 1.')
  })

  it('fil med ugyldig felt, og sier hvor feilen er', () => {
    const data = sampleData()
    const text = JSON.stringify({ ...data, risks: [{ ...data.risks[0], consequence: 0 }] })
    const result = rejected(text)
    expect(result.message).toBe('Innholdet har ugyldige felt.')
    expect(result.details).toEqual(['risks.0.consequence: Velg en verdi fra 1 til 5'])
  })

  it('fil som mangler en liste', () => {
    const { areas: _areas, ...withoutAreas } = sampleData()
    const result = rejected(JSON.stringify({ ...withoutAreas, risks: [] }))
    expect(result.message).toBe('Innholdet har ugyldige felt.')
    expect(result.details[0]).toMatch(/^areas: /)
  })

  it('fil med ødelagte referanser', () => {
    const text = JSON.stringify({ ...sampleData(), themes: [] })
    const result = rejected(text)
    expect(result.message).toBe('Innholdet henger ikke sammen.')
    expect(result.details).toEqual([
      'Risikoen «Leverandør går konkurs» viser til tema som ikke finnes.',
      'Risikoen «Ny støtteordning» viser til tema som ikke finnes.',
    ])
  })

  it('fil med to eiere med samme navn', () => {
    const data = sampleData()
    const text = JSON.stringify({
      ...data,
      owners: [...data.owners, { id: 'o3', name: 'kari nordmann' }],
    })
    expect(rejected(text).details).toEqual([
      'Navnet «kari nordmann» er brukt flere ganger (risikoeier).',
    ])
  })
})
