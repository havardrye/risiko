import { screen, within } from '@testing-library/react'
import type { AppData, Risk } from '../../domain/schema.ts'
import { currentParams } from '../../test/location.ts'
import { renderApp } from '../../test/renderApp.tsx'

function risk(overrides: Partial<Risk> & Pick<Risk, 'id' | 'title'>): Risk {
  return {
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 1,
    consequence: 1,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  }
}

function seed(): AppData {
  return {
    schemaVersion: 5,
    owners: [
      { id: 'o1', name: 'Kari Nordmann' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [
      { id: 't1', name: 'Leverandør' },
      { id: 't2', name: 'Sikkerhet' },
    ],
    areas: [
      { id: 'a1', name: 'IT' },
      { id: 'a2', name: 'Økonomi' },
    ],
    risks: [
      risk({
        id: 'r1',
        title: 'Leverandør går konkurs',
        description: 'Kritisk underleverandør av drift',
        likelihood: 2,
        consequence: 5, // Middels
      }),
      risk({
        id: 'r2',
        title: 'Datainnbrudd',
        ownerId: 'o2',
        themeId: 't2',
        likelihood: 4,
        consequence: 5, // Høy
      }),
      risk({
        id: 'r3',
        title: 'Ny støtteordning',
        description: 'Ekstern finansiering',
        type: 'opportunity',
        ownerId: 'o2',
        areaId: 'a2',
        likelihood: 3,
        consequence: 5, // Stor
      }),
      risk({
        id: 'r4',
        title: 'Strømbrudd',
        themeId: 't2',
        areaId: 'a2',
        likelihood: 1,
        consequence: 2, // Lav
      }),
    ],
  }
}

async function openPage(route = '/') {
  const app = renderApp({ route, data: seed() })
  await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
  const bar = screen.getByRole('search', { name: 'Filtrer risikoer' })
  return { ...app, bar }
}

function titles() {
  return within(screen.getByRole('table'))
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)
    .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'nb'))
}

describe('filtre i risikoregisteret (K4)', () => {
  it('viser alle risikoer og ingen nullstillknapp uten filter', async () => {
    const { bar } = await openPage()
    expect(titles()).toHaveLength(4)
    expect(screen.getByText('4 risikoer')).toBeInTheDocument()
    expect(within(bar).queryByRole('button', { name: 'Nullstill filtre' })).not.toBeInTheDocument()
  })

  it('viser bare risikoene til valgt eier (akseptkriterium)', async () => {
    const { user, bar } = await openPage()
    await user.selectOptions(within(bar).getByLabelText('Eier'), 'Ola Åsen')

    expect(titles()).toEqual(['Datainnbrudd', 'Ny støtteordning'])
    expect(screen.getByText('Viser 2 av 4 risikoer')).toBeInTheDocument()
  })

  it('filtrerer på type, tema, område og nivå', async () => {
    const { user, bar } = await openPage()

    await user.selectOptions(within(bar).getByLabelText('Type'), 'Mulighet')
    expect(titles()).toEqual(['Ny støtteordning'])
    await user.selectOptions(within(bar).getByLabelText('Type'), 'Alle')

    await user.selectOptions(within(bar).getByLabelText('Tema'), 'Sikkerhet')
    expect(titles()).toEqual(['Datainnbrudd', 'Strømbrudd'])
    await user.selectOptions(within(bar).getByLabelText('Tema'), 'Alle')

    await user.selectOptions(within(bar).getByLabelText('Område'), 'Økonomi')
    expect(titles()).toEqual(['Ny støtteordning', 'Strømbrudd'])
    await user.selectOptions(within(bar).getByLabelText('Område'), 'Alle')

    await user.selectOptions(within(bar).getByLabelText('Nivå'), 'Middels')
    expect(titles()).toEqual(['Leverandør går konkurs'])
  })

  it('viser nivånavn for begge typer, eller for valgt type', async () => {
    const { user, bar } = await openPage()
    const levelSelect = within(bar).getByLabelText('Nivå')
    const options = () =>
      within(levelSelect)
        .getAllByRole('option')
        .map((option) => option.textContent)

    expect(options()).toEqual(['Alle', 'Høy / Stor', 'Middels', 'Lav / Liten'])
    await user.selectOptions(within(bar).getByLabelText('Type'), 'Mulighet')
    expect(options()).toEqual(['Alle', 'Stor', 'Middels', 'Liten'])
  })

  it('finner nivå Høy og Stor med samme filter', async () => {
    const { user, bar } = await openPage()
    await user.selectOptions(within(bar).getByLabelText('Nivå'), 'Høy / Stor')
    expect(titles()).toEqual(['Datainnbrudd', 'Ny støtteordning'])
  })

  it('søker i tittel og beskrivelse', async () => {
    const { user, bar } = await openPage()
    await user.type(within(bar).getByLabelText('Søk'), 'brudd')
    expect(titles()).toEqual(['Datainnbrudd', 'Strømbrudd'])

    await user.clear(within(bar).getByLabelText('Søk'))
    await user.type(within(bar).getByLabelText('Søk'), 'finansiering')
    expect(titles()).toEqual(['Ny støtteordning'])
  })

  it('kombinerer filtre', async () => {
    const { user, bar } = await openPage()
    await user.selectOptions(within(bar).getByLabelText('Eier'), 'Kari Nordmann')
    await user.selectOptions(within(bar).getByLabelText('Tema'), 'Sikkerhet')
    expect(titles()).toEqual(['Strømbrudd'])
  })

  it('viser melding og nullstillknapp når ingenting passer', async () => {
    const { user, bar } = await openPage()
    await user.type(within(bar).getByLabelText('Søk'), 'finnes ikke')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Ingen risikoer passer filteret.')).toBeInTheDocument()

    const resetButtons = screen.getAllByRole('button', { name: 'Nullstill filtre' })
    await user.click(resetButtons[resetButtons.length - 1]!)
    expect(titles()).toHaveLength(4)
    expect(within(bar).getByLabelText('Søk')).toHaveValue('')
  })

  it('nullstiller alle filtre', async () => {
    const { user, bar } = await openPage()
    await user.selectOptions(within(bar).getByLabelText('Eier'), 'Ola Åsen')
    await user.selectOptions(within(bar).getByLabelText('Nivå'), 'Høy / Stor')
    await user.click(within(bar).getByRole('button', { name: 'Nullstill filtre' }))

    expect(titles()).toHaveLength(4)
    expect(within(bar).getByLabelText('Eier')).toHaveValue('')
    expect(within(bar).getByLabelText('Nivå')).toHaveValue('')
    expect(currentParams().toString()).toBe('')
  })
})

describe('filtre i adressen', () => {
  it('lagrer filtrene i adressen med lesbare navn', async () => {
    const { user, bar } = await openPage()
    await user.selectOptions(within(bar).getByLabelText('Eier'), 'Ola Åsen')
    await user.selectOptions(within(bar).getByLabelText('Type'), 'Trussel')
    await user.selectOptions(within(bar).getByLabelText('Nivå'), 'Høy')
    await user.type(within(bar).getByLabelText('Søk'), 'inn')

    expect(Object.fromEntries(currentParams())).toEqual({
      eier: 'o2',
      type: 'trussel',
      niva: '3',
      sok: 'inn',
    })
  })

  it('leser filtrene fra adressen, som etter sideoppdatering eller fra et bokmerke', async () => {
    const { bar } = await openPage('/?eier=o2&type=mulighet')

    expect(titles()).toEqual(['Ny støtteordning'])
    expect(within(bar).getByLabelText('Eier')).toHaveDisplayValue('Ola Åsen')
    expect(within(bar).getByLabelText('Type')).toHaveDisplayValue('Mulighet')
  })

  it('leser søk, tema, område og nivå fra adressen', async () => {
    const { bar } = await openPage('/?sok=brudd&tema=t2&omrade=a1&niva=3')
    expect(titles()).toEqual(['Datainnbrudd'])
    expect(within(bar).getByLabelText('Søk')).toHaveValue('brudd')
  })

  it('ignorerer ukjente verdier, f.eks. en eier som er slettet', async () => {
    const { bar } = await openPage('/?eier=slettet&type=ukjent&niva=9')

    expect(titles()).toHaveLength(4)
    expect(within(bar).getByLabelText('Eier')).toHaveValue('')
    expect(screen.getByText('4 risikoer')).toBeInTheDocument()
  })
})
