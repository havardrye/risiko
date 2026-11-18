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
  it('støtter versjon 1 og 2', () => {
    expect(SUPPORTED_VERSIONS).toEqual([1, 2])
  })

  it('gir alle områder «0 - 3 år» ved løft fra versjon 1 (beslutning 7)', () => {
    const migrated = migrate(version1())
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.areas).toEqual([
      { id: 'a1', name: 'IT', horizon: '0-3' },
      { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn', horizon: '0-3' },
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

  it('beholder en verdi som allerede finnes', () => {
    const data = { ...version1(), areas: [{ id: 'a1', name: 'IT', horizon: '5+' }] }
    expect(migrate(data).areas).toEqual([{ id: 'a1', name: 'IT', horizon: '5+' }])
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

    expect(data.schemaVersion).toBe(2)
    expect(data.areas.map((area) => area.horizon)).toEqual(['0-3', '0-3'])
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
      expect(result.data.schemaVersion).toBe(2)
      expect(result.data.areas.every((area) => area.horizon === '0-3')).toBe(true)
    }
  })

  it('avviser fortsatt et område i versjon 2 uten «Når?»', () => {
    const data = { ...version1(), schemaVersion: 2 }
    const result = parseImportFile(JSON.stringify(data))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.details).toContain('areas.0.horizon: «Når?» er påkrevd')
  })

  it('avviser en ukjent verdi for «Når?»', () => {
    const data = {
      ...version1(),
      schemaVersion: 2,
      areas: [{ id: 'a1', name: 'IT', horizon: '10 år' }],
      risks: [],
    }
    const result = parseImportFile(JSON.stringify(data))
    expect(result.ok).toBe(false)
  })
})
