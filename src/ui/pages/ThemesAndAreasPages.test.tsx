import { screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

// Registerkomponenten er testet grundig via eiersiden. Her sjekkes at
// tema- og områdesidene er riktig satt opp: tekster, beskrivelsesfelt,
// riktig liste i datasettet og slettesperre mot riktig felt på risikoen.

function seed(): AppData {
  return {
    schemaVersion: 1,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [
      { id: 't1', name: 'Leverandør', description: 'Avhengighet av eksterne' },
      { id: 't2', name: 'Sikkerhet' },
    ],
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
        consequence: 3,
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      },
    ],
  }
}

function rows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      Array.from(row.children)
        .slice(0, 3)
        .map((cell) => cell.textContent),
    )
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
      ['IT', '–', '1'],
      ['Økonomi', 'Regnskap og lønn', '0'],
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
