import { emptyAppData, type AppData } from '../domain/schema.ts'
import { LocalStorageRepository, STORAGE_KEY } from './localStorageRepository.ts'
import { StoredDataError } from './repository.ts'

function sampleData(): AppData {
  return {
    schemaVersion: 5,
    owners: [{ id: 'o1', name: 'Kari Nordmann', email: 'kari@example.com' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT', description: 'Drift og utvikling' }],
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
        createdAt: '2026-11-17T20:00:00.000Z',
        updatedAt: '2026-11-17T20:00:00.000Z',
      },
    ],
  }
}

async function loadError(repository: LocalStorageRepository): Promise<StoredDataError> {
  try {
    await repository.load()
  } catch (error) {
    if (error instanceof StoredDataError) return error
    throw error
  }
  throw new Error('Forventet StoredDataError')
}

beforeEach(() => {
  localStorage.clear()
})

describe('LocalStorageRepository', () => {
  it('gir tomt datasett når ingenting er lagret', async () => {
    expect(await new LocalStorageRepository().load()).toEqual(emptyAppData())
  })

  it('leser tilbake det som ble lagret', async () => {
    const repository = new LocalStorageRepository()
    await repository.save(sampleData())
    expect(await repository.load()).toEqual(sampleData())
  })

  it('beholder data mellom instanser, som ved omstart', async () => {
    await new LocalStorageRepository().save(sampleData())
    expect(await new LocalStorageRepository().load()).toEqual(sampleData())
  })

  it('lagrer under én nøkkel i samme format som datasettet', async () => {
    await new LocalStorageRepository().save(sampleData())
    expect(localStorage.length).toBe(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual(sampleData())
  })

  describe('ugyldig lagret innhold', () => {
    it.each([
      ['ugyldig JSON', '{ikke json', 'Innholdet er ikke gyldig JSON.'],
      ['noe annet enn et objekt', '[1,2,3]', 'Innholdet er ikke et risikoregister.'],
      [
        'manglende versjon',
        '{"owners":[]}',
        'Innholdet mangler versjonsnummer og er ikke et risikoregister.',
      ],
      [
        'ukjent versjon',
        JSON.stringify({ ...emptyAppData(), schemaVersion: 6 }),
        'Innholdet har versjon 6, men appen støtter bare versjon 1–5.',
      ],
    ])('gir feil ved %s og lar innholdet stå urørt', async (_name, raw, message) => {
      localStorage.setItem(STORAGE_KEY, raw)
      const error = await loadError(new LocalStorageRepository())
      expect(error.message).toBe(message)
      expect(error.raw).toBe(raw)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
    })

    it('gir feil med detaljer ved ugyldige felt', async () => {
      const data = sampleData()
      const raw = JSON.stringify({ ...data, risks: [{ ...data.risks[0], likelihood: 9 }] })
      localStorage.setItem(STORAGE_KEY, raw)
      const error = await loadError(new LocalStorageRepository())
      expect(error.message).toBe('Innholdet har ugyldige felt.')
      expect(error.details[0]).toMatch(/^risks\.0\.likelihood: /)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
    })

    it('gir feil når en risiko peker på noe som ikke finnes', async () => {
      const raw = JSON.stringify({ ...sampleData(), owners: [] })
      localStorage.setItem(STORAGE_KEY, raw)
      const error = await loadError(new LocalStorageRepository())
      expect(error.message).toBe('Innholdet henger ikke sammen.')
      expect(error.details).toEqual([
        'Risikoen «Leverandør går konkurs» viser til risikoeier som ikke finnes.',
      ])
    })

    it('begrenser antall detaljer', async () => {
      const data = sampleData()
      const risks = Array.from({ length: 15 }, (_, i) => ({
        ...data.risks[0],
        id: `r${i}`,
        ownerId: 'finnes-ikke',
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, risks }))
      const error = await loadError(new LocalStorageRepository())
      expect(error.details).toHaveLength(11)
      expect(error.details.at(-1)).toBe('… og 5 feil til.')
    })
  })

  describe('subscribe', () => {
    it('varsler ved lagring', async () => {
      const repository = new LocalStorageRepository()
      const listener = vi.fn()
      repository.subscribe(listener)
      await repository.save(sampleData())
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('varsler når en annen fane endrer dataene eller tømmer lagringen', () => {
      const repository = new LocalStorageRepository()
      const listener = vi.fn()
      repository.subscribe(listener)

      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, storageArea: localStorage }),
      )
      window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))

      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('varsler ikke for andre nøkler eller annen lagring', () => {
      const repository = new LocalStorageRepository()
      const listener = vi.fn()
      repository.subscribe(listener)

      window.dispatchEvent(
        new StorageEvent('storage', { key: 'noe-annet', storageArea: localStorage }),
      )
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, storageArea: sessionStorage }),
      )

      expect(listener).not.toHaveBeenCalled()
    })

    it('slutter å varsle etter avmelding', async () => {
      const repository = new LocalStorageRepository()
      const listener = vi.fn()
      const unsubscribe = repository.subscribe(listener)
      unsubscribe()

      await repository.save(sampleData())
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, storageArea: localStorage }),
      )

      expect(listener).not.toHaveBeenCalled()
    })

    it('varsler alle abonnenter', async () => {
      const repository = new LocalStorageRepository()
      const first = vi.fn()
      const second = vi.fn()
      repository.subscribe(first)
      repository.subscribe(second)
      await repository.save(sampleData())
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).toHaveBeenCalledTimes(1)
    })
  })
})
