import { screen, within } from '@testing-library/react'
import { emptyAppData, type AppData } from '../../domain/schema.ts'
import { LocalStorageRepository, STORAGE_KEY } from '../../data/localStorageRepository.ts'
import { renderApp } from '../../test/renderApp.tsx'

// Registerkomponenten er testet grundig via eiersiden. Her sjekkes at
// tema- og områdesidene er riktig satt opp: tekster, beskrivelsesfelt,
// riktig liste i datasettet og slettesperre mot riktig felt på risikoen.

function seed(): AppData {
  return {
    schemaVersion: 5,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [
      // Begge temaene hører til IT (spec 006).
      { id: 't1', code: 'T-1', name: 'Leverandør', description: 'Avhengighet av eksterne', areaId: 'a1' },
      { id: 't2', code: 'T-2', name: 'Sikkerhet', areaId: 'a1' },
    ],
    areas: [
      { id: 'a1', code: 'O-1', name: 'IT' },
      { id: 'a2', code: 'O-2', name: 'Økonomi', description: 'Regnskap og lønn' },
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
        consequence: 3,
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      },
    ],
  }
}

/** Celletekstene i hver rad, uten overskriftsraden og kolonnen med knapper. */
function rows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      Array.from(row.children)
        .slice(0, -1)
        .map((cell) => cell.textContent),
    )
}

type User = ReturnType<typeof renderApp>['user']

/** Fyller ut påkrevde felt utover navn: ID (spec 004) og område for temaer (spec 006). */
const FILL_REQUIRED = {
  themes: async (user: User, dialog: HTMLElement) => {
    await user.type(within(dialog).getByLabelText('ID'), 'X-9')
    await user.type(within(dialog).getByLabelText('Område'), 'O-1')
  },
  areas: async (user: User, dialog: HTMLElement) => {
    await user.type(within(dialog).getByLabelText('ID'), 'X-9')
  },
}

const PAGES = [
  {
    route: '/temaer',
    title: 'Risikotemaer',
    create: 'Nytt tema',
    editTitle: 'Endre tema',
    deleteTitle: 'Slette temaet?',
    blockedTitle: 'Kan ikke slette temaet',
    list: 'themes',
    empty: /Ingen risikotemaer er registrert ennå/,
    rows: [
      ['T-1', 'Leverandør', 'O-1', 'IT', 'Avhengighet av eksterne', '1'],
      ['T-2', 'Sikkerhet', 'O-1', 'IT', '–', '0'],
    ],
    // Et tema trenger et område å høre til (spec 006).
    startData: (): AppData => ({ ...emptyAppData(), areas: [{ id: 'a1', code: 'O-1', name: 'IT' }] }),
    inUse: 'Leverandør',
    unused: 'Sikkerhet',
  },
  {
    route: '/omrader',
    title: 'Risikoområder',
    create: 'Nytt område',
    editTitle: 'Endre område',
    deleteTitle: 'Slette området?',
    blockedTitle: 'Kan ikke slette området',
    list: 'areas',
    empty: /Ingen risikoområder er registrert ennå/,
    rows: [
      ['O-1', 'IT', '–', '1'],
      ['O-2', 'Økonomi', 'Regnskap og lønn', '0'],
    ],
    startData: (): AppData | undefined => undefined,
    inUse: 'IT',
    unused: 'Økonomi',
  },
] as const

describe.each(PAGES)('$title', (page) => {
  async function open(data?: AppData) {
    const app = renderApp({ route: page.route, ...(data ? { data } : {}) })
    await screen.findByRole('heading', { level: 1, name: page.title })
    return app
  }

  it('viser veiledning når registeret er tomt', async () => {
    await open()
    expect(screen.getByText(page.empty)).toBeInTheDocument()
  })

  it('lister elementene med beskrivelse og antall risikoer', async () => {
    await open(seed())
    expect(screen.getByRole('columnheader', { name: 'Beskrivelse' })).toBeInTheDocument()
    expect(rows()).toEqual(page.rows)
  })

  it('oppretter element med beskrivelse', async () => {
    const { user, repository } = await open(page.startData())
    await user.click(screen.getByRole('button', { name: page.create }))

    const dialog = screen.getByRole('dialog', { name: page.create })
    await user.type(within(dialog).getByLabelText('Navn'), 'Personal')
    await user.type(within(dialog).getByLabelText('Beskrivelse (valgfritt)'), 'Bemanning{Enter}og kompetanse')
    await FILL_REQUIRED[page.list](user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Personal' })).toBeInTheDocument()
    expect((await repository.load())[page.list]).toMatchObject([
      { name: 'Personal', description: 'Bemanning\nog kompetanse' },
    ])
  })

  it('avviser navn som allerede er i bruk', async () => {
    const { user } = await open(seed())
    await user.click(screen.getByRole('button', { name: page.create }))
    await user.type(screen.getByLabelText('Navn'), page.unused.toUpperCase())
    await FILL_REQUIRED[page.list](user, screen.getByRole('dialog'))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('Navn')).toHaveAccessibleDescription('Navnet er allerede i bruk.')
  })

  it('endrer element', async () => {
    const { user } = await open(seed())
    await user.click(screen.getByRole('button', { name: `Endre ${page.unused}` }))
    const dialog = screen.getByRole('dialog', { name: page.editTitle })
    await user.type(within(dialog).getByLabelText('Beskrivelse (valgfritt)'), ' – oppdatert')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByText(/– oppdatert$/)).toBeInTheDocument()
  })

  it('sletter element som ikke er i bruk', async () => {
    const { user, repository } = await open(seed())
    await user.click(screen.getByRole('button', { name: `Slett ${page.unused}` }))
    const dialog = screen.getByRole('dialog', { name: page.deleteTitle })
    await user.click(within(dialog).getByRole('button', { name: 'Slett' }))

    expect(screen.queryByRole('rowheader', { name: page.unused })).not.toBeInTheDocument()
    expect((await repository.load())[page.list]).toHaveLength(1)
  })

  it('sperrer sletting av element i bruk', async () => {
    const { user, repository } = await open(seed())
    await user.click(screen.getByRole('button', { name: `Slett ${page.inUse}` }))

    const dialog = screen.getByRole('dialog', { name: page.blockedTitle })
    // For området IT står også temaene i listen, etter risikoene (spec 006).
    expect(within(dialog).getAllByRole('listitem')[0]).toHaveTextContent('Leverandør går konkurs')
    expect((await repository.load())[page.list]).toHaveLength(2)
  })
})

describe('?rediger= i tema- og områdesidene (spec 004)', () => {
  it.each([
    ['/temaer?rediger=t2', 'Endre tema', 'Sikkerhet'],
    ['/omrader?rediger=a2', 'Endre område', 'Økonomi'],
  ])('%s åpner riktig element', async (route, title, name) => {
    renderApp({ route, data: seed() })
    const dialog = await screen.findByRole('dialog', { name: title })
    expect(within(dialog).getByLabelText('Navn')).toHaveValue(name)
  })
})

describe('område på tema (spec 006, K63–K68)', () => {
  async function openThemes(data: AppData = seed()) {
    const app = renderApp({ route: '/temaer', data })
    await screen.findByRole('heading', { level: 1, name: 'Risikotemaer' })
    return app
  }

  it('viser navnet når område-ID-en passer, og viser ID og navn i listen (akseptkriterium)', async () => {
    const { user, repository } = await openThemes()
    await user.click(screen.getByRole('button', { name: 'Nytt tema' }))
    await user.type(screen.getByLabelText('ID'), 'T-3')
    await user.type(screen.getByLabelText('Navn'), 'Personal')
    await user.type(screen.getByLabelText('Område'), 'o-2 ')
    expect(screen.getByLabelText('Område')).toHaveAccessibleDescription('Økonomi')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Personal' })).toBeInTheDocument()
    expect(rows()).toContainEqual(['T-3', 'Personal', 'O-2', 'Økonomi', '–', '0'])
    expect((await repository.load()).themes.find((theme) => theme.name === 'Personal')?.areaId).toBe('a2')
  })

  it('krever område på et nytt tema (akseptkriterium)', async () => {
    const { user, repository } = await openThemes()
    await user.click(screen.getByRole('button', { name: 'Nytt tema' }))
    await user.type(screen.getByLabelText('ID'), 'T-3')
    await user.type(screen.getByLabelText('Navn'), 'Personal')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('Område')).toHaveAccessibleDescription('Område er påkrevd')
    expect(screen.getByLabelText('Område')).toHaveFocus()
    expect((await repository.load()).themes).toHaveLength(2)
  })

  it('avviser en område-ID som ingen har (akseptkriterium)', async () => {
    const { user } = await openThemes()
    await user.click(screen.getByRole('button', { name: 'Nytt tema' }))
    await user.type(screen.getByLabelText('ID'), 'T-3')
    await user.type(screen.getByLabelText('Navn'), 'Personal')
    await user.type(screen.getByLabelText('Område'), 'O-9')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('Område')).toHaveAccessibleDescription('Ingen område har ID «O-9».')
  })

  it('viser «Mangler område» for et tema fra før, og krever område når det endres (akseptkriterium)', async () => {
    const data = seed()
    data.themes = data.themes.map(({ areaId: _areaId, ...theme }) => theme)
    const { user } = await openThemes(data)
    expect(rows()).toContainEqual(['T-2', 'Sikkerhet', 'Mangler område', 'Mangler område', '–', '0'])

    await user.click(screen.getByRole('button', { name: 'Endre Sikkerhet' }))
    expect(screen.getByLabelText('Område')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(screen.getByLabelText('Område')).toHaveAccessibleDescription('Område er påkrevd')
  })

  it('beholder koblingen til et område uten ID når feltet ikke endres (akseptkriterium, K65)', async () => {
    const data = seed()
    data.areas = data.areas.map(({ code: _code, ...area }) => area)
    const { user, repository } = await openThemes(data)
    expect(rows()).toContainEqual(['T-2', 'Sikkerhet', 'Mangler ID', 'IT', '–', '0'])

    await user.click(screen.getByRole('button', { name: 'Endre Sikkerhet' }))
    expect(screen.getByLabelText('Område')).toHaveValue('IT (mangler ID)')
    await user.type(screen.getByLabelText('Beskrivelse (valgfritt)'), 'Tilgang')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByText('Tilgang')).toBeInTheDocument()
    expect((await repository.load()).themes.find((theme) => theme.id === 't2')?.areaId).toBe('a1')
  })

  it('viser områdets nye ID i temalisten (akseptkriterium, K67)', async () => {
    const data = seed()
    data.areas = data.areas.map((area) => (area.id === 'a1' ? { ...area, code: 'O-01' } : area))
    await openThemes(data)
    expect(rows()).toContainEqual(['T-1', 'Leverandør', 'O-01', 'IT', 'Avhengighet av eksterne', '1'])
  })

  it('sperrer sletting av et område som temaer bruker, og viser temaene (akseptkriterium, K68)', async () => {
    const { user, repository } = renderApp({ route: '/omrader', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    await user.click(screen.getByRole('button', { name: 'Slett IT' }))

    const dialog = screen.getByRole('dialog', { name: 'Kan ikke slette området' })
    expect(within(dialog).getByText(/«IT» er i bruk av 1 risiko og 2 temaer/)).toBeInTheDocument()
    const lists = within(dialog).getAllByRole('list')
    expect(within(lists[0]!).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Leverandør går konkurs',
    ])
    expect(within(lists[1]!).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Leverandør',
      'Sikkerhet',
    ])
    expect(within(dialog).getByRole('heading', { name: 'Temaer' })).toBeInTheDocument()
    expect((await repository.load()).areas).toHaveLength(2)
  })

  it('forklarer det når bare temaer bruker området', async () => {
    const data = seed()
    data.risks = []
    data.themes = [data.themes[0]!]
    const { user } = renderApp({ route: '/omrader', data })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    await user.click(screen.getByRole('button', { name: 'Slett IT' }))
    expect(screen.getByText('«IT» er i bruk av dette temaet. Endre eller slett det først.')).toBeInTheDocument()
  })
})

describe('områder uten «Når?» (spec 007, K72)', () => {
  it('har ID, Navn og Beskrivelse i skjemaet, og ikke «Når?» (akseptkriterium)', async () => {
    const { user } = renderApp({ route: '/omrader', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    await user.click(screen.getByRole('button', { name: 'Nytt område' }))
    const dialog = screen.getByRole('dialog', { name: 'Nytt område' })

    const labels = Array.from(dialog.querySelectorAll('label')).map((label) => label.textContent)
    expect(labels).toEqual(['ID', 'Navn', 'Beskrivelse (valgfritt)'])
    expect(within(dialog).queryByLabelText('Når?')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('har ikke kolonnen «Når?» i listen (akseptkriterium)', async () => {
    renderApp({ route: '/omrader', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'ID',
      'Navn',
      'Beskrivelse',
      'Risikoer',
      'Handlinger',
    ])
  })

  it('viser lagrede områder med «Når?» uten feil, og lagrer dem uten feltet (akseptkriterium)', async () => {
    localStorage.clear()
    const stored = { ...seed(), schemaVersion: 4, areas: seed().areas.map((area) => ({ ...area, horizon: '3-5' })) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const repository = new LocalStorageRepository()
    const { user } = renderApp({ route: '/omrader', repository })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    expect(screen.getByRole('rowheader', { name: 'Økonomi' })).toBeInTheDocument()

    // Neste lagring skriver dataene i versjon 5, uten «Når?».
    await user.click(screen.getByRole('button', { name: 'Endre Økonomi' }))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { schemaVersion: number; areas: object[] }
    expect(saved.schemaVersion).toBe(5)
    expect(saved.areas.some((area) => 'horizon' in area)).toBe(false)
    localStorage.clear()
  })
})
