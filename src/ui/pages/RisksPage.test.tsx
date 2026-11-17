import { screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

function references(): AppData {
  return {
    schemaVersion: 1,
    owners: [
      { id: 'o1', name: 'Ola Åsen' },
      { id: 'o2', name: 'Kari Nordmann' },
    ],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT' }],
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
  it('lister alt som mangler, med lenker, og skjuler «Ny risiko»', async () => {
    await openPage()
    const guide = screen.getByRole('region', { name: 'Kom i gang' })
    expect(
      within(guide)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'minst én risikoeier, under Risikoeiere',
      'minst ett risikotema, under Risikotemaer',
      'minst ett risikoområde, under Risikoområder',
    ])
    expect(screen.queryByRole('button', { name: 'Ny risiko' })).not.toBeInTheDocument()
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

    await user.type(within(dialog).getByLabelText('Tittel'), 'Leverandør går konkurs')
    await user.type(within(dialog).getByLabelText('Beskrivelse (valgfritt)'), 'Kritisk drift')
    await user.selectOptions(within(dialog).getByLabelText('Risikoeier'), 'Kari Nordmann')
    await user.selectOptions(within(dialog).getByLabelText('Tema'), 'Leverandør')
    await user.selectOptions(within(dialog).getByLabelText('Område'), 'IT')
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '2 – Lav')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '5 – Svært alvorlig')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const row = screen.getByRole('rowheader', { name: 'Leverandør går konkurs' }).closest('tr')
    expect(row).toHaveTextContent(/Trussel.*Kari Nordmann.*Leverandør.*IT.*10.*Middels/)
    const [risk] = (await repository.load()).risks
    expect(risk).toMatchObject({
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
    await user.type(within(dialog).getByLabelText('Tittel'), 'Ny støtteordning')
    await user.click(within(dialog).getByLabelText('Mulighet'))
    await user.selectOptions(within(dialog).getByLabelText('Risikoeier'), 'Ola Åsen')
    await user.selectOptions(within(dialog).getByLabelText('Tema'), 'Leverandør')
    await user.selectOptions(within(dialog).getByLabelText('Område'), 'IT')
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

    expect(within(dialog).getByLabelText('Tittel')).toHaveAccessibleDescription('Tittel er påkrevd')
    expect(within(dialog).getByLabelText('Risikoeier')).toHaveAccessibleDescription(
      'Velg en risikoeier',
    )
    expect(within(dialog).getByLabelText('Tema')).toHaveAccessibleDescription('Velg et tema')
    expect(within(dialog).getByLabelText('Område')).toHaveAccessibleDescription('Velg et område')
    expect(within(dialog).getByLabelText('Sannsynlighet')).toHaveAccessibleDescription(
      'Velg en verdi fra 1 til 5',
    )
    expect(within(dialog).getByLabelText('Konsekvens')).toHaveAccessibleDescription(
      'Velg en verdi fra 1 til 5',
    )
    expect(within(dialog).getByLabelText('Tittel')).toHaveFocus()
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

    await user.selectOptions(within(dialog).getByLabelText('Risikoeier'), 'Ola Åsen')
    expect(within(dialog).getByLabelText('Risikoeier')).toBeValid()

    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    expect(within(dialog).getByLabelText('Tema')).toHaveFocus()
  })

  it('lister eierne alfabetisk', async () => {
    const { dialog } = await openForm()
    expect(optionTexts(within(dialog).getByLabelText('Risikoeier'))).toEqual([
      'Velg risikoeier',
      'Kari Nordmann',
      'Ola Åsen',
    ])
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
