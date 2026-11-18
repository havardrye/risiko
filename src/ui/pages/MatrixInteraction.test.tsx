import { screen, waitFor, within } from '@testing-library/react'
import type { AppData, Risk } from '../../domain/schema.ts'
import { currentLocation, currentParams } from '../../test/location.ts'
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
    schemaVersion: 3,
    owners: [
      { id: 'o1', name: 'Kari Nordmann' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [
      { id: 't1', name: 'Leverandør' },
      { id: 't2', name: 'Sikkerhet' },
    ],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks: [
      risk({ id: 'r1', title: 'Datainnbrudd', themeId: 't2', likelihood: 4, consequence: 5 }),
      risk({
        id: 'r2',
        title: 'Phishing',
        ownerId: 'o2',
        themeId: 't2',
        likelihood: 4,
        consequence: 5,
      }),
      risk({ id: 'r3', title: 'Leverandør går konkurs', likelihood: 4, consequence: 5 }),
      risk({ id: 'r4', title: 'Strømbrudd', likelihood: 2, consequence: 2 }),
      risk({
        id: 'r5',
        title: 'Ny støtteordning',
        type: 'opportunity',
        likelihood: 3,
        consequence: 4,
      }),
    ],
  }
}

const THREAT_4_5 = 'Trussel, sannsynlighet 4 Høy, konsekvens 5 Svært alvorlig, nivå Høy'

async function openMatrix(route = '/matrise') {
  const app = renderApp({ route, data: seed() })
  await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
  return app
}

function cellButton(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) })
}

function nav() {
  return screen.getByRole('navigation', { name: 'Hovedmeny' })
}

describe('celledetaljer (K8)', () => {
  it('gjør bare celler med risikoer klikkbare', async () => {
    await openMatrix()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('button')).toHaveLength(3)
  })

  it('viser risikoene i cellen ved klikk, og markerer cellen som valgt', async () => {
    const { user } = await openMatrix()
    await user.click(cellButton(THREAT_4_5))

    const details = screen.getByRole('region', {
      name: 'Trussel: sannsynlighet 4 høy, konsekvens 5 svært alvorlig',
    })
    expect(
      within(details)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Datainnbrudd · Kari Nordmann',
      'Phishing · Ola Åsen',
      'Leverandør går konkurs · Kari Nordmann',
    ])
    expect(within(details).getByText('Høy')).toBeInTheDocument()
    expect(cellButton(THREAT_4_5)).toHaveAttribute('aria-pressed', 'true')
  })

  it('bytter til en annen celle og lukker ved nytt klikk eller «Lukk»', async () => {
    const { user } = await openMatrix()
    await user.click(cellButton(THREAT_4_5))
    await user.click(cellButton('Mulighet, sannsynlighet 3'))

    const details = screen.getByRole('region', { name: /^Mulighet:/ })
    expect(within(details).getAllByRole('listitem')).toHaveLength(1)
    expect(cellButton(THREAT_4_5)).toHaveAttribute('aria-pressed', 'false')

    await user.click(cellButton('Mulighet, sannsynlighet 3'))
    expect(screen.queryByRole('region', { name: /^Mulighet:/ })).not.toBeInTheDocument()

    await user.click(cellButton(THREAT_4_5))
    await user.click(screen.getByRole('button', { name: 'Lukk' }))
    expect(screen.queryByRole('region', { name: /^Trussel:/ })).not.toBeInTheDocument()
  })

  it('lenker til registeret og åpner risikoen der', async () => {
    const { user } = await openMatrix()
    await user.click(cellButton(THREAT_4_5))
    await user.click(screen.getByRole('link', { name: 'Phishing' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: 'Endre risiko' })
    expect(within(dialog).getByLabelText('Tittel')).toHaveValue('Phishing')
    // Parameteren fjernes, så dialogen ikke åpnes på nytt ved sideoppdatering.
    await waitFor(() => expect(currentParams().has('risiko')).toBe(false))
    expect(screen.getByRole('dialog', { name: 'Endre risiko' })).toBeInTheDocument()
  })

  it('kan åpne samme risiko fra matrisen flere ganger', async () => {
    const { user } = await openMatrix()
    for (let attempt = 0; attempt < 2; attempt++) {
      await user.click(within(nav()).getByRole('link', { name: 'Risikomatrise' }))
      await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
      await user.click(cellButton(THREAT_4_5))
      await user.click(screen.getByRole('link', { name: 'Phishing' }))
      const dialog = await screen.findByRole('dialog', { name: 'Endre risiko' })
      await waitFor(() => expect(currentParams().has('risiko')).toBe(false))
      await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  })

  it('åpner ingenting for en risiko som ikke finnes', async () => {
    renderApp({ route: '/?risiko=finnes-ikke', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(currentParams().has('risiko')).toBe(false))
  })
})

describe('filtre i matrisen (K9)', () => {
  it('endrer antallene når et tema velges (akseptkriterium)', async () => {
    const { user } = await openMatrix()
    expect(cellButton(THREAT_4_5)).toHaveAccessibleName(`${THREAT_4_5}, 3 risikoer`)

    const bar = screen.getByRole('search', { name: 'Filtrer risikoer' })
    await user.selectOptions(within(bar).getByLabelText('Tema'), 'Sikkerhet')

    expect(cellButton(THREAT_4_5)).toHaveAccessibleName(`${THREAT_4_5}, 2 risikoer`)
    expect(screen.queryByRole('button', { name: /^Mulighet/ })).not.toBeInTheDocument()
    expect(screen.getByText('Viser 2 av 5 risikoer')).toBeInTheDocument()
  })

  it('oppdaterer listen i valgt celle når filteret endres', async () => {
    const { user } = await openMatrix()
    await user.click(cellButton(THREAT_4_5))
    const bar = screen.getByRole('search', { name: 'Filtrer risikoer' })
    await user.selectOptions(within(bar).getByLabelText('Eier'), 'Ola Åsen')

    const details = screen.getByRole('region', { name: /^Trussel:/ })
    expect(within(details).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Phishing · Ola Åsen',
    ])

    await user.selectOptions(within(bar).getByLabelText('Type'), 'Mulighet')
    expect(within(details).getByText(/Ingen risikoer i denne cellen/)).toBeInTheDocument()
  })

  it('tar med filtrene fra registeret til matrisen og tilbake', async () => {
    const { user } = renderApp({ route: '/', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    const bar = () => screen.getByRole('search', { name: 'Filtrer risikoer' })
    await user.selectOptions(within(bar()).getByLabelText('Eier'), 'Ola Åsen')

    await user.click(within(nav()).getByRole('link', { name: 'Risikomatrise' }))
    await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
    expect(currentLocation()).toBe('/matrise?eier=o2')
    expect(within(bar()).getByLabelText('Eier')).toHaveDisplayValue('Ola Åsen')
    expect(cellButton(THREAT_4_5)).toHaveAccessibleName(`${THREAT_4_5}, 1 risiko`)

    await user.selectOptions(within(bar()).getByLabelText('Nivå'), 'Høy / Stor')
    await user.click(within(nav()).getByRole('link', { name: 'Risikoregister' }))
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    expect(Object.fromEntries(currentParams())).toEqual({ eier: 'o2', niva: '3' })
  })

  it('tar ikke med filtrene til eier-, tema- og områdesidene', async () => {
    const { user } = await openMatrix('/matrise?eier=o2')
    expect(within(nav()).getByRole('link', { name: 'Risikoeiere' })).toHaveAttribute(
      'href',
      '/eiere',
    )
    await user.click(within(nav()).getByRole('link', { name: 'Risikoeiere' }))
    expect(currentLocation()).toBe('/eiere')
  })
})

describe('hopp til innhold', () => {
  it('flytter fokus til hovedinnholdet uten å bytte side', async () => {
    const { user } = await openMatrix()
    await user.click(screen.getByRole('link', { name: 'Hopp til innhold' }))

    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1, name: 'Risikomatrise' })).toBeInTheDocument()
    expect(currentLocation()).toBe('/matrise')
  })
})

describe('ID i matrisedetaljene (spec 004, K49)', () => {
  it('viser «R-007» foran tittelen, og bare tittelen når ID mangler (akseptkriterium)', async () => {
    const data = seed()
    data.risks[0] = { ...data.risks[0]!, code: 'R-007' }
    const { user } = renderApp({ route: '/matrise', data })
    await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
    await user.click(cellButton(THREAT_4_5))

    const details = screen.getByRole('region', {
      name: 'Trussel: sannsynlighet 4 høy, konsekvens 5 svært alvorlig',
    })
    expect(within(details).getByRole('link', { name: 'R-007 Datainnbrudd' })).toBeInTheDocument()
    expect(within(details).getByRole('link', { name: 'Phishing' })).toBeInTheDocument()
  })
})
