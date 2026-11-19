import { screen, waitFor, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { currentParams } from '../../test/location.ts'
import { renderApp } from '../../test/renderApp.tsx'

function seed(): AppData {
  const risk = {
    type: 'threat' as const,
    themeId: 't1',
    areaId: 'a1',
    likelihood: 2 as const,
    consequence: 3 as const,
    createdAt: '2026-11-17T10:00:00.000Z',
    updatedAt: '2026-11-17T10:00:00.000Z',
  }
  return {
    schemaVersion: 5,
    owners: [
      { id: 'o1', code: 'E-1', name: 'Ola Åsen' },
      { id: 'o2', code: 'E-2', name: 'Kari Nordmann', email: 'kari@example.com' },
      { id: 'o3', code: 'E-3', name: 'Anne Berg' },
    ],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT' }],
    risks: [
      { ...risk, id: 'r1', title: 'Leverandør går konkurs', ownerId: 'o2' },
      { ...risk, id: 'r2', title: 'Datainnbrudd', ownerId: 'o2' },
      { ...risk, id: 'r3', title: 'Nøkkelperson slutter', ownerId: 'o1' },
    ],
  }
}

async function openPage(data?: AppData) {
  const app = renderApp({ route: '/eiere', ...(data ? { data } : {}) })
  await screen.findByRole('heading', { level: 1, name: 'Risikoeiere' })
  return app
}

/** Radene i tabellen som lister med celletekst, uten overskriftsraden. */
function rows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      Array.from(row.children)
        .slice(0, 4)
        .map((cell) => cell.textContent),
    )
}

describe('register over risikoeiere', () => {
  it('viser veiledning når registeret er tomt', async () => {
    await openPage()
    expect(screen.getByText(/Ingen risikoeiere er registrert ennå/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lister eierne alfabetisk med e-post og antall risikoer (K14)', async () => {
    await openPage(seed())
    expect(rows()).toEqual([
      ['E-3', 'Anne Berg', '–', '0'],
      ['E-2', 'Kari Nordmann', 'kari@example.com', '2'],
      ['E-1', 'Ola Åsen', '–', '1'],
    ])
  })

  it('oppretter en eier (K11)', async () => {
    const { user, repository } = await openPage()

    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    const dialog = screen.getByRole('dialog', { name: 'Ny risikoeier' })
    await user.type(within(dialog).getByLabelText('ID'), 'E-9')
    await user.type(within(dialog).getByLabelText('Navn'), 'Kari Nordmann')
    await user.type(within(dialog).getByLabelText('E-post (valgfritt)'), 'kari@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Kari Nordmann' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rows()).toEqual([['E-9', 'Kari Nordmann', 'kari@example.com', '0']])
    expect((await repository.load()).owners).toMatchObject([
      { code: 'E-9', name: 'Kari Nordmann', email: 'kari@example.com' },
    ])
  })

  it('kan opprette eier uten e-post, med Enter i navnefeltet', async () => {
    const { user } = await openPage()
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), 'E-9')
    await user.type(screen.getByLabelText('Navn'), 'Per Hansen{Enter}')

    expect(await screen.findByRole('rowheader', { name: 'Per Hansen' })).toBeInTheDocument()
  })

  it('krever ID og navn og viser feilene ved feltene, med fokus på det første', async () => {
    const { user, repository } = await openPage()
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    const code = screen.getByLabelText('ID')
    expect(code).toHaveAccessibleDescription('ID er påkrevd')
    expect(code).toHaveFocus()
    const name = screen.getByLabelText('Navn')
    expect(name).toBeInvalid()
    expect(name).toHaveAccessibleDescription('Navn er påkrevd')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((await repository.load()).owners).toEqual([])
  })

  it('avviser ugyldig e-post', async () => {
    const { user, repository } = await openPage()
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), 'E-9')
    await user.type(screen.getByLabelText('Navn'), 'Per Hansen')
    await user.type(screen.getByLabelText('E-post (valgfritt)'), 'ikke-epost')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('E-post (valgfritt)')).toHaveAccessibleDescription(
      'Ugyldig e-postadresse',
    )
    expect((await repository.load()).owners).toEqual([])
  })

  it('avviser navn som allerede er i bruk (K12)', async () => {
    const { user, repository } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), 'E-9')
    await user.type(screen.getByLabelText('Navn'), ' kari nordmann ')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('Navn')).toHaveAccessibleDescription('Navnet er allerede i bruk.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((await repository.load()).owners).toHaveLength(3)
  })

  it('lar brukeren rette feilen og lagre', async () => {
    const { user } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), 'E-9')
    await user.type(screen.getByLabelText('Navn'), 'Kari Nordmann')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    await user.type(screen.getByLabelText('Navn'), ' jr.')
    expect(screen.getByLabelText('Navn')).toBeValid()
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Kari Nordmann jr.' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('endrer en eier, med feltene fylt ut på forhånd', async () => {
    const { user } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Endre Kari Nordmann' }))

    const dialog = screen.getByRole('dialog', { name: 'Endre risikoeier' })
    const name = within(dialog).getByLabelText('Navn')
    expect(name).toHaveValue('Kari Nordmann')
    expect(within(dialog).getByLabelText('E-post (valgfritt)')).toHaveValue('kari@example.com')

    await user.clear(name)
    await user.type(name, 'Kari Hansen')
    await user.clear(within(dialog).getByLabelText('E-post (valgfritt)'))
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByRole('rowheader', { name: 'Kari Hansen' })).toBeInTheDocument()
    expect(rows()).toContainEqual(['E-2', 'Kari Hansen', '–', '2'])
    expect(screen.queryByRole('rowheader', { name: 'Kari Nordmann' })).not.toBeInTheDocument()
  })

  it('lar en eier beholde navnet sitt ved endring', async () => {
    const { user } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Endre Anne Berg' }))
    await user.type(screen.getByLabelText('E-post (valgfritt)'), 'anne@example.com')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(await screen.findByText('anne@example.com')).toBeInTheDocument()
  })

  it('forkaster endringer ved Avbryt og starter med blankt skjema neste gang', async () => {
    const { user, repository } = await openPage()
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('Navn'), 'Skal ikke lagres')
    await user.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await repository.load()).owners).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    expect(screen.getByLabelText('Navn')).toHaveValue('')
  })

  it('sletter en eier uten risikoer etter bekreftelse', async () => {
    const { user, repository } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Slett Anne Berg' }))

    const dialog = screen.getByRole('dialog', { name: 'Slette risikoeieren?' })
    expect(within(dialog).getByText(/«Anne Berg» blir slettet/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Slett' }))

    expect(screen.queryByRole('rowheader', { name: 'Anne Berg' })).not.toBeInTheDocument()
    expect((await repository.load()).owners.map((owner) => owner.id)).toEqual(['o1', 'o2'])
  })

  it('flytter fokus til sideoverskriften når eieren er slettet', async () => {
    const { user } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Slett Anne Berg' }))
    await user.click(screen.getByRole('button', { name: 'Slett' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Risikoeiere' })).toHaveFocus()
  })

  it('sletter ikke når brukeren avbryter', async () => {
    const { user, repository } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Slett Anne Berg' }))
    await user.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(screen.getByRole('rowheader', { name: 'Anne Berg' })).toBeInTheDocument()
    expect((await repository.load()).owners).toHaveLength(3)
  })

  it('sperrer sletting av eier med risikoer og viser hvilke (K13)', async () => {
    const { user, repository } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Slett Kari Nordmann' }))

    const dialog = screen.getByRole('dialog', { name: 'Kan ikke slette risikoeieren' })
    expect(within(dialog).getByText(/er i bruk av disse 2 risikoene/)).toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Leverandør går konkurs', 'Datainnbrudd'])
    expect(within(dialog).queryByRole('button', { name: 'Slett' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Lukk' }))
    expect(screen.getByRole('rowheader', { name: 'Kari Nordmann' })).toBeInTheDocument()
    expect((await repository.load()).owners).toHaveLength(3)
  })

  it('bruker entall når én risiko blokkerer', async () => {
    const { user } = await openPage(seed())
    await user.click(screen.getByRole('button', { name: 'Slett Ola Åsen' }))
    expect(screen.getByText(/er i bruk av denne risikoen/)).toBeInTheDocument()
  })
})

describe('ID i registrene (spec 004, K47–K50)', () => {
  async function openOwners(data: AppData, route = '/eiere') {
    const app = renderApp({ route, data })
    await screen.findByRole('heading', { level: 1, name: 'Risikoeiere' })
    return app
  }

  it('har ID som første felt og første kolonne', async () => {
    const { user } = await openOwners(seed())
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('ID')
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    const dialog = screen.getByRole('dialog', { name: 'Ny risikoeier' })
    expect(within(dialog).getAllByRole('textbox')[0]).toBe(within(dialog).getByLabelText('ID'))
    expect(within(dialog).getByLabelText('ID')).toHaveAttribute('maxLength', '20')
  })

  it('avviser en ID som er i bruk, uansett skrivemåte (K50)', async () => {
    const { user, repository } = await openOwners(seed())
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), ' e-2 ')
    await user.type(screen.getByLabelText('Navn'), 'Per Hansen')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('ID')).toHaveAccessibleDescription('ID-en er allerede i bruk.')
    expect(screen.getByLabelText('ID')).toHaveFocus()
    expect((await repository.load()).owners).toHaveLength(3)
  })

  it('godtar samme ID som en risiko har: eier «7» og risiko «7» (akseptkriterium)', async () => {
    const data = seed()
    data.risks[0] = { ...data.risks[0]!, code: '7' }
    const { user, repository } = await openOwners(data)
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('ID'), '7')
    await user.type(screen.getByLabelText('Navn'), 'Per Hansen{Enter}')

    expect(await screen.findByRole('rowheader', { name: 'Per Hansen' })).toBeInTheDocument()
    expect((await repository.load()).owners.at(-1)?.code).toBe('7')
  })

  it('beholder koblingen til risikoene når eieren får ny ID (akseptkriterium)', async () => {
    const { user, repository } = await openOwners(seed())
    await user.click(screen.getByRole('button', { name: 'Endre Kari Nordmann' }))
    const code = screen.getByLabelText('ID')
    expect(code).toHaveValue('E-2')
    await user.clear(code)
    await user.type(code, 'E-02{Enter}')

    await screen.findByText('E-02')
    expect(rows()).toContainEqual(['E-02', 'Kari Nordmann', 'kari@example.com', '2'])
    const saved = await repository.load()
    expect(saved.risks.filter((risk) => risk.ownerId === 'o2')).toHaveLength(2)
  })

  it('krever ID når en gammel eier uten ID endres', async () => {
    const data = seed()
    data.owners = data.owners.map(({ code: _code, ...owner }) => owner)
    const { user, repository } = await openOwners(data)
    await user.click(screen.getByRole('button', { name: 'Endre Anne Berg' }))
    await user.type(screen.getByLabelText('E-post (valgfritt)'), 'anne@example.com')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(screen.getByLabelText('ID')).toHaveAccessibleDescription('ID er påkrevd')
    expect((await repository.load()).owners.find((owner) => owner.id === 'o3')?.email).toBeUndefined()
  })

  it('åpner riktig element med ?rediger= og fjerner parameteren', async () => {
    await openOwners(seed(), '/eiere?rediger=o2')
    const dialog = await screen.findByRole('dialog', { name: 'Endre risikoeier' })
    expect(within(dialog).getByLabelText('Navn')).toHaveValue('Kari Nordmann')
    await waitFor(() => expect(currentParams().has('rediger')).toBe(false))
  })

  it('ignorerer ?rediger= med ukjent id', async () => {
    await openOwners(seed(), '/eiere?rediger=finnes-ikke')
    await waitFor(() => expect(currentParams().has('rediger')).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
