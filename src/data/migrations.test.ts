import { emptyAppData } from '../domain/schema.ts'
import { parseImportFile } from './exportImport.ts'
import { LocalStorageRepository, STORAGE_KEY } from './localStorageRepository.ts'
import { migrate, SUPPORTED_VERSIONS } from './migrations.ts'

/** Et datasett slik versjon 1 av appen lagret og eksporterte det, før «Når?» fantes. */
function version1() {
  return {
    schemaVersion: 1,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [
      { id: 'a1', name: 'IT' },
      { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn' },
    ],
    risks: [
      {
        id: 'r1',
        title: 'Leverandør går konkurs',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 2,
        consequence: 5,
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      },
    ],
  }
}

describe('migrate', () => {
  it('støtter versjon 1–6', () => {
    expect(SUPPORTED_VERSIONS).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('løfter versjon 1 helt til gjeldende versjon, uten «Når?» (spec 007)', () => {
    const migrated = migrate(version1())
    expect(migrated.schemaVersion).toBe(6)
    expect(migrated.areas).toEqual([
      { id: 'a1', name: 'IT' },
      { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn' },
    ])
  })

  it('endrer ikke resten av datasettet', () => {
    const original = version1()
    const migrated = migrate(original)
    expect(migrated.owners).toEqual(original.owners)
    expect(migrated.themes).toEqual(original.themes)
    expect(migrated.risks).toEqual(original.risks)
  })

  it('endrer ikke objektet som sendes inn', () => {
    const original = version1()
    migrate(original)
    expect(original).toEqual(version1())
  })

  it('fjerner også «Når?» som var satt i versjon 1', () => {
    const data = { ...version1(), areas: [{ id: 'a1', name: 'IT', horizon: '5+' }] }
    expect(migrate(data).areas).toEqual([{ id: 'a1', name: 'IT' }])
  })

  it('lar gjeldende versjon være som den er', () => {
    const current = emptyAppData()
    expect(migrate(current)).toBe(current)
  })
})

describe('eldre data i appen (K25, akseptkriterium)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('leser lagrede data i versjon 1 uten å avvise dem', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(version1()))
    const data = await new LocalStorageRepository().load()

    expect(data.schemaVersion).toBe(6)
    expect(data.areas.some((area) => 'horizon' in area)).toBe(false)
    expect(data.risks).toHaveLength(1)
  })

  it('lar lagringen stå urørt til neste endring', async () => {
    const raw = JSON.stringify(version1())
    localStorage.setItem(STORAGE_KEY, raw)
    await new LocalStorageRepository().load()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('importerer en eksportfil i versjon 1', () => {
    const result = parseImportFile(JSON.stringify(version1(), null, 2))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(6)
      expect(result.data.areas.some((area) => 'horizon' in area)).toBe(false)
    }
  })

  it('godtar et område i versjon 2 uten «Når?», nå som feltet er fjernet (spec 007)', () => {
    const data = { ...version1(), schemaVersion: 2 }
    expect(parseImportFile(JSON.stringify(data)).ok).toBe(true)
  })
})

describe('versjon 2 → 3 (spec 004, egne ID-er)', () => {
  function version2() {
    return { ...migrate(version1()), schemaVersion: 2 }
  }

  it('løfter versjonen og endrer ingen data (beslutning 5)', () => {
    const original = version2()
    const migrated = migrate(original)
    expect(migrated).toEqual({ ...original, schemaVersion: 6 })
  })

  it('gir ingen elementer en ID', () => {
    const migrated = migrate(version2()) as { risks: object[]; areas: object[] }
    expect([...migrated.risks, ...migrated.areas].some((item) => 'code' in item)).toBe(false)
  })

  it('leser en eksportfil i versjon 2 uten feil', () => {
    const result = parseImportFile(JSON.stringify(version2()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.schemaVersion).toBe(6)
  })

  it('avviser en nyere versjon med riktig melding', () => {
    const result = parseImportFile(JSON.stringify({ ...version2(), schemaVersion: 7 }))
    expect(result).toMatchObject({
      ok: false,
      message: 'Innholdet har versjon 7, men appen støtter bare versjon 1–6.',
    })
  })
})

describe('versjon 3 → 4 (spec 006, område på tema, fjernet igjen i spec 008)', () => {
  function version3() {
    return { ...migrate(version1()), schemaVersion: 3 }
  }

  it('løfter versjonen og endrer ingen data', () => {
    const original = version3()
    expect(migrate(original)).toEqual({ ...original, schemaVersion: 6 })
  })

  it('gir ingen temaer et område', () => {
    const migrated = migrate(version3()) as { themes: object[] }
    expect(migrated.themes.some((theme) => 'areaId' in theme)).toBe(false)
  })

  it('leser en eksportfil i versjon 3 uten feil', () => {
    const result = parseImportFile(JSON.stringify(version3()))
    expect(result.ok && result.data.schemaVersion).toBe(6)
  })
})

describe('versjon 4 → 5 (spec 007, «Når?» fjernet)', () => {
  function version4() {
    return {
      ...migrate(version1()),
      schemaVersion: 4,
      areas: [
        { id: 'a1', name: 'IT', horizon: '0-3' },
        { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn', horizon: '5+' },
      ],
    }
  }

  it('sletter «Når?» fra alle områder og løfter versjonen (K73, beslutning 1)', () => {
    const migrated = migrate(version4())
    expect(migrated.schemaVersion).toBe(6)
    expect(migrated.areas).toEqual([
      { id: 'a1', name: 'IT' },
      { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn' },
    ])
  })

  it('endrer ikke resten av datasettet', () => {
    const original = version4()
    const { areas: _a, schemaVersion: _v, ...rest } = migrate(original)
    const { areas: _oa, schemaVersion: _ov, ...originalRest } = original
    expect(rest).toEqual(originalRest)
  })

  it('leser lagrede data i versjon 4 med «Når?» uten feil (akseptkriterium)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(version4()))
    const data = await new LocalStorageRepository().load()
    expect(data.schemaVersion).toBe(6)
    expect(data.areas.some((area) => 'horizon' in area)).toBe(false)
  })

  it('importerer en JSON-eksport fra før endringen (akseptkriterium)', () => {
    const result = parseImportFile(JSON.stringify(version4(), null, 2))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.areas.map((area) => area.name)).toEqual(['IT', 'Økonomi'])
  })
})

describe('versjon 5 → 6 (spec 008, område på tema fjernet)', () => {
  function version5() {
    const data = migrate(version1()) as { themes: object[] }
    return {
      ...data,
      schemaVersion: 5,
      themes: [
        { id: 't1', name: 'Leverandør', areaId: 'a1' },
        { id: 't2', code: 'T-2', name: 'Omdømme' },
      ],
    }
  }

  it('sletter området fra alle temaer og løfter versjonen (K77, beslutning 1)', () => {
    const migrated = migrate(version5())
    expect(migrated.schemaVersion).toBe(6)
    expect(migrated.themes).toEqual([
      { id: 't1', name: 'Leverandør' },
      { id: 't2', code: 'T-2', name: 'Omdømme' },
    ])
  })

  it('beholder risikoenes område og resten av datasettet', () => {
    const original = version5()
    const { themes: _t, schemaVersion: _v, ...rest } = migrate(original)
    const { themes: _ot, schemaVersion: _ov, ...originalRest } = original
    expect(rest).toEqual(originalRest)
    expect((rest.risks as { areaId: string }[])[0]?.areaId).toBe('a1')
  })

  it('leser lagrede data i versjon 5 med område på temaer uten feil (akseptkriterium)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(version5()))
    const data = await new LocalStorageRepository().load()
    expect(data.schemaVersion).toBe(6)
    expect(data.themes.some((theme) => 'areaId' in theme)).toBe(false)
  })

  it('importerer en JSON-eksport fra før endringen (akseptkriterium)', () => {
    const result = parseImportFile(JSON.stringify(version5(), null, 2))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.themes.map((theme) => theme.name)).toEqual(['Leverandør', 'Omdømme'])
      expect(result.data.themes.some((theme) => 'areaId' in theme)).toBe(false)
    }
  })

  it('godtar også et tema som viser til et område som ikke finnes', () => {
    const data = { ...version5(), themes: [{ id: 't1', name: 'Leverandør', areaId: 'finnes-ikke' }] }
    expect(parseImportFile(JSON.stringify(data)).ok).toBe(true)
  })
})
