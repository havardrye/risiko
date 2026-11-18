import { screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

// Registerkomponenten er testet grundig via eiersiden. Her sjekkes at
// tema- og områdesidene er riktig satt opp: tekster, beskrivelsesfelt,
// riktig liste i datasettet og slettesperre mot riktig felt på risikoen.

function seed(): AppData {
  return {
    schemaVersion: 2,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [
      { id: 't1', name: 'Leverandør', description: 'Avhengighet av eksterne' },
      { id: 't2', name: 'Sikkerhet' },
    ],
    areas: [
      { id: 'a1', name: 'IT', horizon: '0-3' },
      { id: 'a2', name: 'Økonomi', description: 'Regnskap og lønn', horizon: '3-5' },
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

/** Fyller ut påkrevde felt utover navn. Bare områder har det («Når?», K25). */
const FILL_REQUIRED = {
  themes: async () => {},
  areas: async (user: User, dialog: HTMLElement) => {
    await user.selectOptions(within(dialog).getByLabelText('Når?'), '0 - 3 år')
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
      ['Leverandør', 'Avhengighet av eksterne', '1'],
      ['Sikkerhet', '–', '0'],
    ],
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
      ['IT', '0 - 3 år', '–', '1'],
      ['Økonomi', '3 - 5 år', 'Regnskap og lønn', '0'],
    ],
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
    const { user, repository } = await open()
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
    expect(within(dialog).getByRole('listitem')).toHaveTextContent('Leverandør går konkurs')
    expect((await repository.load())[page.list]).toHaveLength(2)
  })
})

describe('«Når?» på områder (K25)', () => {
  async function open(data: AppData = seed()) {
    const app = renderApp({ route: '/omrader', data })
    await screen.findByRole('heading', { level: 1, name: 'Risikoområder' })
    return app
  }

  it('har nedtrekksmeny med de tre valgene', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Nytt område' }))
    const select = screen.getByLabelText('Når?')

    expect(select.tagName).toBe('SELECT')
    expect(select).toBeRequired()
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Velg når', '0 - 3 år', '3 - 5 år', '5 år +'])
    expect(select).toHaveValue('')
  })

  it('krever valg: viser feil ved feltet og lagrer ingenting (akseptkriterium)', async () => {
    const { user, repository } = await open()
    await user.click(screen.getByRole('button', { name: 'Nytt område' }))
    await user.type(screen.getByLabelText('Navn'), 'Personal')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('Når?')).toHaveAccessibleDescription('«Når?» er påkrevd')
    expect(screen.getByLabelText('Når?')).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((await repository.load()).areas).toHaveLength(2)
  })

  it('lagrer valgt verdi og viser den i listen (akseptkriterium)', async () => {
    const { user, repository } = await open()
    await user.click(screen.getByRole('button', { name: 'Nytt område' }))
    await user.type(screen.getByLabelText('Navn'), 'Personal')
    await user.selectOptions(screen.getByLabelText('Når?'), '5 år +')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Personal' })).toBeInTheDocument()
    expect(rows()).toContainEqual(['Personal', '5 år +', '–', '0'])
    expect((await repository.load()).areas).toContainEqual(
      expect.objectContaining({ name: 'Personal', horizon: '5+' }),
    )
  })

  it('fyller ut valgt verdi ved endring, og lagrer ny verdi', async () => {
    const { user, repository } = await open()
    await user.click(screen.getByRole('button', { name: 'Endre Økonomi' }))
    expect(screen.getByLabelText('Når?')).toHaveDisplayValue('3 - 5 år')

    await user.selectOptions(screen.getByLabelText('Når?'), '0 - 3 år')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(rows()).toContainEqual(['Økonomi', '0 - 3 år', 'Regnskap og lønn', '0'])
    expect((await repository.load()).areas.find((a) => a.id === 'a2')?.horizon).toBe('0-3')
  })

  it('viser kolonnen «Når?» bare for områder', async () => {
    await open()
    expect(screen.getByRole('columnheader', { name: 'Når?' })).toBeInTheDocument()
  })
})
