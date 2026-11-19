import { MemoryRepository } from '../data/memoryRepository.ts'
import { StoredDataError } from '../data/repository.ts'
import { emptyAppData, type AppData, type RiskInput } from '../domain/schema.ts'
import { DataError, DataStore } from './dataStore.ts'

const T1 = '2026-11-17T10:00:00.000Z'
const T2 = '2026-11-18T12:30:00.000Z'

function seed(): AppData {
  return {
    schemaVersion: 5,
    owners: [
      { id: 'o1', name: 'Kari Nordmann' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT' }],
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
        createdAt: T1,
        updatedAt: T1,
      },
    ],
  }
}

const riskInput: RiskInput = {
  code: 'R-100',
  title: 'Datainnbrudd',
  type: 'threat',
  ownerId: 'o2',
  themeId: 't1',
  areaId: 'a1',
  likelihood: 4,
  consequence: 5,
}

async function setup(initial: AppData = seed()) {
  const repository = new MemoryRepository(initial)
  const save = vi.spyOn(repository, 'save')
  let time = T2
  let nextId = 1
  const store = new DataStore(repository, {
    now: () => new Date(time),
    newId: () => `ny-${nextId++}`,
  })
  await store.start()
  return {
    repository,
    save,
    store,
    setTime: (value: string) => {
      time = value
    },
    data: () => {
      const state = store.getState()
      if (state.status !== 'ready') throw new Error(`Forventet klar tilstand, fikk ${state.status}`)
      return state.data
    },
  }
}

async function rejection(promise: Promise<unknown>): Promise<DataError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof DataError) return error
    throw error
  }
  throw new Error('Forventet DataError')
}

describe('innlesing', () => {
  it('starter i lastetilstand og blir klar med lagrede data', async () => {
    const store = new DataStore(new MemoryRepository(seed()))
    expect(store.getState()).toEqual({ status: 'loading' })
    await store.start()
    expect(store.getState()).toEqual({ status: 'ready', data: seed() })
  })

  it('går til feiltilstand når lagret innhold ikke kan leses', async () => {
    const repository = new MemoryRepository()
    const error = new StoredDataError('Innholdet er ikke gyldig JSON.', '{ødelagt')
    vi.spyOn(repository, 'load').mockRejectedValue(error)
    const store = new DataStore(repository)
    await store.start()
    expect(store.getState()).toEqual({ status: 'error', error })
  })

  it('avviser endringer før data er lastet', async () => {
    const store = new DataStore(new MemoryRepository(seed()))
    const error = await rejection(store.createRisk(riskInput))
    expect(error.message).toBe('Data er ikke lastet.')
  })

  it('leser inn endringer fra en annen fane', async () => {
    const { repository, store, data } = await setup()
    const listener = vi.fn()
    store.subscribe(listener)

    repository.changeExternally({ ...seed(), risks: [] })
    await vi.waitFor(() => expect(data().risks).toEqual([]))
    expect(listener).toHaveBeenCalled()
  })

  it('slutter å følge med på repository etter stop', async () => {
    const { repository, store, data } = await setup()
    store.stop()
    repository.changeExternally(emptyAppData())
    await Promise.resolve()
    expect(data()).toEqual(seed())
  })
})

describe('risikoer', () => {
  it('oppretter risiko med id og datoer, og lagrer den', async () => {
    const { store, repository, data } = await setup()
    const created = await store.createRisk(riskInput)

    expect(created).toEqual({ ...riskInput, id: 'ny-1', createdAt: T2, updatedAt: T2 })
    expect(data().risks).toHaveLength(2)
    expect((await repository.load()).risks).toContainEqual(created)
  })

  it('varsler abonnenter og gir ny tilstand ved endring', async () => {
    const { store } = await setup()
    const before = store.getState()
    const listener = vi.fn()
    store.subscribe(listener)

    await store.createRisk(riskInput)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getState()).not.toBe(before)
  })

  it('rydder tittel og ser bort fra tom beskrivelse', async () => {
    const { store } = await setup()
    const created = await store.createRisk({ ...riskInput, title: '  Brann ', description: '  ' })
    expect(created.title).toBe('Brann')
    expect(created).not.toHaveProperty('description')
  })

  it('avviser ugyldig skjema med feil per felt, uten å lagre', async () => {
    const { store, save, data } = await setup()
    const error = await rejection(
      store.createRisk({ ...riskInput, title: ' ', ownerId: '', likelihood: 9 as never }),
    )

    expect(error.fieldErrors).toEqual({
      title: 'Tittel er påkrevd',
      ownerId: 'Velg en risikoeier',
      likelihood: 'Velg en verdi fra 1 til 5',
    })
    expect(save).not.toHaveBeenCalled()
    expect(data()).toEqual(seed())
  })

  it('avviser risiko som peker på eier, tema eller område som ikke finnes', async () => {
    const { store, save } = await setup()
    const error = await rejection(
      store.createRisk({ ...riskInput, ownerId: 'x', themeId: 'y', areaId: 'z' }),
    )

    expect(error.fieldErrors).toEqual({
      ownerId: 'Risikoeieren finnes ikke lenger.',
      themeId: 'Temaet finnes ikke lenger.',
      areaId: 'Området finnes ikke lenger.',
    })
    expect(save).not.toHaveBeenCalled()
  })

  it('endrer risiko, beholder opprettet-dato og setter ny endret-dato', async () => {
    const { store, data } = await setup()
    const updated = await store.updateRisk('r1', { ...riskInput, title: 'Nytt navn' })

    expect(updated).toEqual({
      ...riskInput,
      title: 'Nytt navn',
      id: 'r1',
      createdAt: T1,
      updatedAt: T2,
    })
    expect(data().risks).toEqual([updated])
  })

  it('avviser endring av risiko som ikke finnes eller har ugyldige felt', async () => {
    const { store, save } = await setup()
    expect((await rejection(store.updateRisk('finnes-ikke', riskInput))).message).toBe(
      'Risikoen finnes ikke lenger.',
    )
    expect(
      (await rejection(store.updateRisk('r1', { ...riskInput, title: '' }))).fieldErrors,
    ).toEqual({ title: 'Tittel er påkrevd' })
    expect(save).not.toHaveBeenCalled()
  })

  it('sletter risiko', async () => {
    const { store, repository, data } = await setup()
    await store.deleteRisk('r1')
    expect(data().risks).toEqual([])
    expect((await repository.load()).risks).toEqual([])
  })

  it('gjør ingenting ved sletting av risiko som allerede er borte', async () => {
    const { store, save } = await setup()
    await store.deleteRisk('finnes-ikke')
    expect(save).not.toHaveBeenCalled()
  })
})

describe('eiere, temaer og områder', () => {
  it('oppretter eier, tema og område', async () => {
    const { store, data } = await setup()
    const owner = await store.createReference('owner', {
      code: ' E-9 ',
      name: ' Per Hansen ',
      email: 'per@example.com',
    })
    const theme = await store.createReference('theme', { code: 'K-1', name: 'Sikkerhet', description: 'IKT' , areaId: 'a1' })
    const area = await store.createReference('area', { code: 'K-2', name: 'Økonomi' })

    expect(owner).toEqual({ id: 'ny-1', code: 'E-9', name: 'Per Hansen', email: 'per@example.com' })
    expect(theme).toEqual({ id: 'ny-2', code: 'K-1', name: 'Sikkerhet', description: 'IKT', areaId: 'a1' })
    expect(area).toEqual({ id: 'ny-3', code: 'K-2', name: 'Økonomi' })
    expect(data().owners).toHaveLength(3)
    expect(data().themes).toHaveLength(2)
    expect(data().areas).toHaveLength(2)
  })

  it('ser bort fra tom e-post og beskrivelse', async () => {
    const { store } = await setup()
    expect(await store.createReference('owner', { code: 'K-3', name: 'Per', email: '' })).toEqual({
      id: 'ny-1',
      code: 'K-3',
      name: 'Per',
    })
    expect(
      await store.createReference('area', { code: 'K-4', name: 'HR', description: ' ' }),
    ).toEqual({
      id: 'ny-2',
      code: 'K-4',
      name: 'HR',
    })
  })

  it('avviser manglende navn og ugyldig e-post uten å lagre', async () => {
    const { store, save } = await setup()
    expect((await rejection(store.createReference('theme', { code: 'K-7', name: '  ' , areaId: 'a1' }))).fieldErrors).toEqual({
      name: 'Navn er påkrevd',
    })
    expect(
      (await rejection(store.createReference('owner', { code: 'K-8', name: 'Per', email: 'ikke-epost' })))
        .fieldErrors,
    ).toEqual({ email: 'Ugyldig e-postadresse' })
    expect(save).not.toHaveBeenCalled()
  })

  it('avviser navn som allerede er i bruk, uansett skrivemåte', async () => {
    const { store, save, data } = await setup()
    const error = await rejection(store.createReference('owner', { code: 'K-9', name: ' kari  NORDMANN' }))

    expect(error.fieldErrors).toEqual({ name: 'Navnet er allerede i bruk.' })
    expect(save).not.toHaveBeenCalled()
    expect(data().owners).toHaveLength(2)
  })

  it('tillater samme navn i ulike registre', async () => {
    const { store } = await setup()
    await expect(
      store.createReference('area', { code: 'K-10', name: 'Leverandør' }),
    ).resolves.toMatchObject({
      name: 'Leverandør',
    })
  })

  it('endrer element og lar det beholde sitt eget navn', async () => {
    const { store, data } = await setup()
    const updated = await store.updateReference('owner', 'o1', {
      code: 'E-1',
      name: 'Kari Nordmann',
      email: 'kari@example.com',
    })

    expect(updated).toEqual({ id: 'o1', code: 'E-1', name: 'Kari Nordmann', email: 'kari@example.com' })
    expect(data().owners[0]).toEqual(updated)
    expect(data().owners).toHaveLength(2)
  })

  it('hindrer at et element får navnet til et annet', async () => {
    const { store, save } = await setup()
    const error = await rejection(store.updateReference('owner', 'o2', { code: 'K-11', name: 'Kari Nordmann' }))
    expect(error.fieldErrors).toEqual({ name: 'Navnet er allerede i bruk.' })
    expect(save).not.toHaveBeenCalled()
  })

  it('avviser endring av element som ikke finnes', async () => {
    const { store } = await setup()
    expect((await rejection(store.updateReference('theme', 'x', { code: 'K-12', name: 'Nytt' , areaId: 'a1' }))).message).toBe(
      'Temaet finnes ikke lenger.',
    )
  })

  it('sletter element som ikke er i bruk', async () => {
    const { store, data } = await setup()
    await store.deleteReference('owner', 'o2')
    expect(data().owners).toEqual([{ id: 'o1', name: 'Kari Nordmann' }])
  })

  it.each([
    ['owner', 'o1', 'Kari Nordmann'],
    ['theme', 't1', 'Leverandør'],
    ['area', 'a1', 'IT'],
  ] as const)('sperrer sletting av %s i bruk og oppgir risikoene', async (kind, id, name) => {
    const { store, save, data } = await setup()
    const error = await rejection(store.deleteReference(kind, id))

    expect(error.message).toBe(`«${name}» kan ikke slettes fordi 1 risiko bruker den.`)
    expect(error.blockingRisks.map((risk) => risk.id)).toEqual(['r1'])
    expect(save).not.toHaveBeenCalled()
    expect(data()).toEqual(seed())
  })

  it('oppgir antall når flere risikoer blokkerer', async () => {
    const { store } = await setup()
    await store.createRisk({ ...riskInput, ownerId: 'o1' })
    const error = await rejection(store.deleteReference('owner', 'o1'))
    expect(error.message).toBe('«Kari Nordmann» kan ikke slettes fordi 2 risikoer bruker den.')
    expect(error.blockingRisks).toHaveLength(2)
  })

  it('tillater sletting etter at risikoen er fjernet', async () => {
    const { store, data } = await setup()
    await store.deleteRisk('r1')
    await store.deleteReference('theme', 't1')
    expect(data().themes).toEqual([])
  })
})

describe('lagring', () => {
  it('lar tilstanden stå urørt hvis lagringen feiler', async () => {
    const { store, save, data } = await setup()
    save.mockRejectedValueOnce(new Error('Lagringen er full'))

    await expect(store.createRisk(riskInput)).rejects.toThrow('Lagringen er full')
    expect(data()).toEqual(seed())

    await store.createRisk(riskInput)
    expect(data().risks).toHaveLength(2)
  })

  it('leser ikke inn på nytt etter egne lagringer', async () => {
    const { store, repository } = await setup()
    const load = vi.spyOn(repository, 'load')
    await store.createRisk(riskInput)
    await Promise.resolve()
    expect(load).not.toHaveBeenCalled()
  })

  it('erstatter alle data, også fra feiltilstand', async () => {
    const repository = new MemoryRepository()
    vi.spyOn(repository, 'load').mockRejectedValueOnce(new StoredDataError('Ugyldig', '{'))
    const store = new DataStore(repository)
    await store.start()
    expect(store.getState().status).toBe('error')

    await store.replaceAll(seed())
    expect(store.getState()).toEqual({ status: 'ready', data: seed() })
    expect(await repository.load()).toEqual(seed())
  })
})

describe('egne ID-er (spec 004, K47, K50)', () => {
  function withCodes(): AppData {
    const data = seed()
    data.risks = [{ ...data.risks[0]!, code: 'R-007' }]
    data.owners = [{ ...data.owners[0]!, code: 'E-1' }, data.owners[1]!]
    return data
  }

  it('lagrer ID på ny risiko og ny eier', async () => {
    const { store, data } = await setup()
    await store.createRisk({ ...riskInput, code: ' R-008 ' })
    await store.createReference('owner', { code: 'E-9', name: 'Per Hansen' })
    expect(data().risks.at(-1)?.code).toBe('R-008')
    expect(data().owners.at(-1)?.code).toBe('E-9')
  })

  it('avviser en risiko med ID som er i bruk, uansett skrivemåte, uten å lagre', async () => {
    const { store, save } = await setup(withCodes())
    const error = await rejection(store.createRisk({ ...riskInput, code: 'r-007 ' }))
    expect(error.fieldErrors).toEqual({ code: 'ID-en er allerede i bruk.' })
    expect(save).not.toHaveBeenCalled()
  })

  it('avviser at en risiko endres til ID-en til en annen', async () => {
    const data = withCodes()
    data.risks.push({ ...data.risks[0]!, id: 'r2', code: 'R-008', title: 'Annen' })
    const { store } = await setup(data)
    const error = await rejection(store.updateRisk('r2', { ...riskInput, code: 'R-007' }))
    expect(error.fieldErrors).toEqual({ code: 'ID-en er allerede i bruk.' })
  })

  it('lar en risiko beholde sin egen ID når den endres', async () => {
    const { store, data } = await setup(withCodes())
    await store.updateRisk('r1', { ...riskInput, code: 'R-007', title: 'Ny tittel' })
    expect(data().risks[0]).toMatchObject({ code: 'R-007', title: 'Ny tittel' })
  })

  it('avviser eier med ID som er i bruk, og melder navn og ID samtidig', async () => {
    const { store, save } = await setup(withCodes())
    const error = await rejection(store.createReference('owner', { code: 'e-1', name: 'kari nordmann' }))
    expect(error.fieldErrors).toEqual({
      code: 'ID-en er allerede i bruk.',
      name: 'Navnet er allerede i bruk.',
    })
    expect(save).not.toHaveBeenCalled()
  })

  it('lar et element beholde sin egen ID, men ikke ta en annens', async () => {
    const { store, data } = await setup(withCodes())
    await store.updateReference('owner', 'o1', { code: 'E-1', name: 'Kari N.' })
    expect(data().owners[0]).toMatchObject({ code: 'E-1', name: 'Kari N.' })
    const error = await rejection(store.updateReference('owner', 'o2', { code: 'E-1', name: 'Ola Åsen' }))
    expect(error.fieldErrors).toEqual({ code: 'ID-en er allerede i bruk.' })
  })

  it('tillater samme ID i ulike typer: eier «7» og risiko «7»', async () => {
    const { store, data } = await setup()
    await store.createReference('owner', { code: '7', name: 'Per Hansen' })
    await store.createRisk({ ...riskInput, code: '7' })
    await store.createReference('theme', { code: '7', name: 'Lønn' , areaId: 'a1' })
    expect([data().owners.at(-1)?.code, data().risks.at(-1)?.code, data().themes.at(-1)?.code]).toEqual(['7', '7', '7'])
  })

  it('avviser ID på mer enn 20 tegn (K48)', async () => {
    const { store } = await setup()
    const error = await rejection(store.createRisk({ ...riskInput, code: 'x'.repeat(21) }))
    expect(error.fieldErrors).toEqual({ code: 'ID kan være høyst 20 tegn' })
  })

  it('beholder koblingene når en eier får ny ID', async () => {
    const { store, data } = await setup(withCodes())
    await store.updateReference('owner', 'o1', { code: 'E-01', name: 'Kari Nordmann' })
    expect(data().risks[0]?.ownerId).toBe('o1')
    expect(data().owners[0]?.code).toBe('E-01')
  })
})

describe('område på tema (spec 006, K63, K68)', () => {
  it('lagrer temaets område', async () => {
    const { store, data } = await setup()
    await store.createReference('theme', { code: 'T-9', name: 'Lønn', areaId: 'a1' })
    expect(data().themes.at(-1)?.areaId).toBe('a1')
  })

  it('avviser et område som ikke finnes, uten å lagre', async () => {
    const { store, save } = await setup()
    const error = await rejection(store.createReference('theme', { code: 'T-9', name: 'Lønn', areaId: 'borte' }))
    expect(error.fieldErrors).toEqual({ areaId: 'Området finnes ikke lenger.' })
    expect(save).not.toHaveBeenCalled()
  })

  it('sperrer sletting av et område som et tema bruker, og oppgir temaet', async () => {
    const initial = seed()
    initial.risks = []
    initial.themes = [{ ...initial.themes[0]!, areaId: 'a1' }]
    const { store, save } = await setup(initial)
    const error = await rejection(store.deleteReference('area', 'a1'))
    expect(error.message).toBe('«IT» kan ikke slettes fordi 1 tema bruker den.')
    expect(error.blockingThemes.map((theme) => theme.id)).toEqual(['t1'])
    expect(error.blockingRisks).toEqual([])
    expect(save).not.toHaveBeenCalled()
  })

  it('nevner både risikoer og temaer når begge bruker området', async () => {
    const initial = seed()
    initial.themes = [{ ...initial.themes[0]!, areaId: 'a1' }]
    const { store } = await setup(initial)
    const error = await rejection(store.deleteReference('area', 'a1'))
    expect(error.message).toBe('«IT» kan ikke slettes fordi 1 risiko og 1 tema bruker den.')
  })

  it('tillater sletting når verken risikoer eller temaer bruker området', async () => {
    const initial = seed()
    initial.areas.push({ id: 'a2', name: 'HR' })
    initial.themes = [{ ...initial.themes[0]!, areaId: 'a1' }]
    const { store, data } = await setup(initial)
    await store.deleteReference('area', 'a2')
    expect(data().areas.map((area) => area.id)).toEqual(['a1'])
  })
})
