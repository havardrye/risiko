import { screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

function references(): AppData {
  return {
    schemaVersion: 5,
    owners: [
      { id: 'o1', code: 'E-1', name: 'Ola Åsen' },
      { id: 'o2', code: 'E-2', name: 'Kari Nordmann' },
    ],
    themes: [{ id: 't1', code: 'T-1', name: 'Leverandør' }],
    areas: [{ id: 'a1', code: 'O-1', name: 'IT' }],
    risks: [],
  }
}

async function openPage(data?: AppData) {
  const app = renderApp({ route: '/', ...(data ? { data } : {}) })
  await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
  return app
}

async function openForm(data: AppData = references()) {
  const app = await openPage(data)
  await app.user.click(screen.getByRole('button', { name: 'Ny risiko' }))
  const dialog = screen.getByRole('dialog', { name: 'Ny risiko' })
  return { ...app, dialog }
}

function optionTexts(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent)
}

describe('veiledning før første risiko (K22)', () => {
  it('lister alt som mangler, med lenker', async () => {
    await openPage()
    const guide = screen.getByRole('region', { name: 'Kom i gang' })
    expect(
      within(guide)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'minst én risikoeier, under Risikoeiere',
      'minst ett risikoområde, under Risikoområder',
      'minst ett risikotema, under Risikotemaer',
    ])
  })

  it('viser alltid «Ny risiko», og forklarer hva som mangler i stedet for å åpne skjemaet', async () => {
    const { user, repository } = await openPage({ ...references(), themes: [] })
    await user.click(screen.getByRole('button', { name: 'Ny risiko' }))

    const dialog = screen.getByRole('dialog', { name: 'Først trengs eier, tema og område' })
    expect(within(dialog).queryByLabelText('Tittel')).not.toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['minst ett risikotema, under Risikotemaer'])

    await user.click(within(dialog).getByRole('link', { name: 'Risikotemaer' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Risikotemaer' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await repository.load()).risks).toEqual([])
  })

  it('lukker forklaringen med «Lukk»', async () => {
    const { user } = await openPage()
    await user.click(screen.getByRole('button', { name: 'Ny risiko' }))
    await user.click(screen.getByRole('button', { name: 'Lukk' }))
    // At fokus går tilbake til knappen, gjør nettleserens <dialog>; jsdom gjør det ikke.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lister bare det som mangler', async () => {
    await openPage({ ...references(), areas: [] })
    expect(within(screen.getByRole('region', { name: 'Kom i gang' })).getAllByRole('listitem'))
      .toHaveLength(1)
  })

  it('leder videre til registeret som mangler', async () => {
    const { user } = await openPage()
    const guide = screen.getByRole('region', { name: 'Kom i gang' })
    await user.click(within(guide).getByRole('link', { name: 'Risikotemaer' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Risikotemaer' })).toBeInTheDocument()
  })

  it('viser «Ny risiko» når eier, tema og område finnes', async () => {
    await openPage(references())
    expect(screen.queryByRole('region', { name: 'Kom i gang' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ny risiko' })).toBeInTheDocument()
  })
})

describe('risikoskjema (K1–K3)', () => {
  it('lagrer en gyldig risiko med riktige verdier og lukker dialogen', async () => {
    const { user, dialog, repository } = await openForm()

    await user.type(within(dialog).getByLabelText('ID'), 'R-1')
    await user.type(within(dialog).getByLabelText('Tittel'), 'Leverandør går konkurs')
    await user.type(within(dialog).getByLabelText('Beskrivelse (valgfritt)'), 'Kritisk drift')
    await user.type(within(dialog).getByLabelText('Risikoeier'), 'E-2')
    await user.type(within(dialog).getByLabelText('Tema'), 'T-1')
    await user.type(within(dialog).getByLabelText('Område'), 'O-1')
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '2 – Lav')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '5 – Svært alvorlig')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const row = screen.getByRole('rowheader', { name: 'Leverandør går konkurs' }).closest('tr')
    expect(row).toHaveTextContent(/Trussel.*Kari Nordmann.*Leverandør.*IT.*10.*Middels/)
    const [risk] = (await repository.load()).risks
    expect(risk).toMatchObject({
      code: 'R-1',
      title: 'Leverandør går konkurs',
      description: 'Kritisk drift',
      type: 'threat',
      ownerId: 'o2',
      themeId: 't1',
      areaId: 'a1',
      likelihood: 2,
      consequence: 5,
    })
    expect(risk?.createdAt).toBe(risk?.updatedAt)
  })

  it('viser score og nivå fortløpende', async () => {
    const { user, dialog } = await openForm()
    expect(within(dialog).getByText(/Velg sannsynlighet og konsekvens/)).toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '2 – Lav')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '5 – Svært alvorlig')
    expect(within(dialog).getByText('Score').parentElement).toHaveTextContent('Score 10')
    expect(within(dialog).getByText('Middels')).toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '4 – Høy')
    expect(within(dialog).getByText('Score').parentElement).toHaveTextContent('Score 20')
    expect(within(dialog).getByText('Høy')).toBeInTheDocument()
  })

  it('bruker nivåtabellen, ikke bare scoren: 1 × 4 er Middels', async () => {
    const { user, dialog } = await openForm()
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '1 – Svært lav')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '4 – Alvorlig')
    expect(within(dialog).getByText('Middels')).toBeInTheDocument()
  })

  it('viser konsekvenstekster for mulighet når type er mulighet', async () => {
    const { user, dialog } = await openForm()
    const consequence = within(dialog).getByLabelText('Konsekvens')
    expect(within(dialog).getByLabelText('Trussel')).toBeChecked()
    expect(optionTexts(consequence).slice(4)).toEqual(['4 – Alvorlig', '5 – Svært alvorlig'])

    await user.click(within(dialog).getByLabelText('Mulighet'))

    expect(optionTexts(consequence).slice(4)).toEqual(['4 – Verdifull', '5 – Svært verdifull'])
  })

  it('beholder valgt konsekvens og bytter nivånavn når type endres', async () => {
    const { user, dialog } = await openForm()
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '4 – Høy')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '5 – Svært alvorlig')
    expect(within(dialog).getByText('Høy')).toBeInTheDocument()

    await user.click(within(dialog).getByLabelText('Mulighet'))

    expect(within(dialog).getByLabelText('Konsekvens')).toHaveDisplayValue('5 – Svært verdifull')
    expect(within(dialog).getByText('Stor')).toBeInTheDocument()
  })

  it('lagrer en mulighet', async () => {
    const { user, dialog, repository } = await openForm()
    await user.type(within(dialog).getByLabelText('ID'), 'M-1')
    await user.type(within(dialog).getByLabelText('Tittel'), 'Ny støtteordning')
    await user.click(within(dialog).getByLabelText('Mulighet'))
    await user.type(within(dialog).getByLabelText('Risikoeier'), 'E-1')
    await user.type(within(dialog).getByLabelText('Tema'), 'T-1')
    await user.type(within(dialog).getByLabelText('Område'), 'O-1')
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '3 – Moderat')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '4 – Verdifull')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect((await repository.load()).risks).toMatchObject([
      { title: 'Ny støtteordning', type: 'opportunity', likelihood: 3, consequence: 4 },
    ])
  })

  it('viser feil ved hvert manglende felt, flytter fokus og lagrer ingenting', async () => {
    const { user, dialog, repository } = await openForm()
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(within(dialog).getByLabelText('ID')).toHaveAccessibleDescription('ID er påkrevd')
    expect(within(dialog).getByLabelText('Tittel')).toHaveAccessibleDescription('Tittel er påkrevd')
    expect(within(dialog).getByLabelText('Risikoeier')).toHaveAccessibleDescription(
      'Risikoeier er påkrevd',
    )
    expect(within(dialog).getByLabelText('Tema')).toHaveAccessibleDescription('Tema er påkrevd')
    expect(within(dialog).getByLabelText('Område')).toHaveAccessibleDescription('Område er påkrevd')
    expect(within(dialog).getByLabelText('Sannsynlighet')).toHaveAccessibleDescription(
      'Velg en verdi fra 1 til 5',
    )
    expect(within(dialog).getByLabelText('Konsekvens')).toHaveAccessibleDescription(
      'Velg en verdi fra 1 til 5',
    )
    expect(within(dialog).getByLabelText('ID')).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((await repository.load()).risks).toEqual([])
  })

  it('fjerner feilen ved et felt så snart det endres, uten å flytte fokus', async () => {
    const { user, dialog } = await openForm()
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    await user.type(within(dialog).getByLabelText('Tittel'), 'B')
    expect(within(dialog).getByLabelText('Tittel')).toBeValid()
    expect(within(dialog).getByLabelText('Tittel')).toHaveFocus()
    expect(within(dialog).getByLabelText('Risikoeier')).toBeInvalid()

    await user.type(within(dialog).getByLabelText('Risikoeier'), 'E-1')
    expect(within(dialog).getByLabelText('Risikoeier')).toBeValid()
    await user.type(within(dialog).getByLabelText('ID'), 'R-1')

    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    expect(within(dialog).getByLabelText('Tema')).toHaveFocus()
  })

  it('foreslår eierne sortert etter ID (spec 005, K58)', async () => {
    const { user, dialog } = await openForm()
    await user.click(within(dialog).getByLabelText('Risikoeier'))
    await user.keyboard('{ArrowDown}')
    expect(
      within(within(dialog).getByRole('listbox'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['E-1 – Ola Åsen', 'E-2 – Kari Nordmann'])
  })

  it('forkaster utfylte felt ved Avbryt', async () => {
    const { user, dialog, repository } = await openForm()
    await user.type(within(dialog).getByLabelText('Tittel'), 'Skal ikke lagres')
    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await repository.load()).risks).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Ny risiko' }))
    expect(screen.getByLabelText('Tittel')).toHaveValue('')
  })
})
