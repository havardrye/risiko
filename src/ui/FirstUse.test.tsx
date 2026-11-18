import { screen, within } from '@testing-library/react'
import type { AppData } from '../domain/schema.ts'
import { renderApp } from '../test/renderApp.tsx'
import { downloadTextFile } from './download.ts'

vi.mock('./download.ts', () => ({ downloadTextFile: vi.fn() }))

beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear()
})

function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

function withOneOfEach(): AppData {
  return {
    schemaVersion: 2,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks: [],
  }
}

describe('varsel om lokal lagring (K23)', () => {
  it.each(['/', '/matrise', '/eiere', '/temaer', '/omrader'])('vises på %s', async (route) => {
    renderApp({ route, data: withOneOfEach() })
    const notice = await screen.findByRole('complementary', { name: 'Om lagring' })
    expect(notice).toHaveTextContent('Data lagres bare i denne nettleseren')
  })

  it('har snarvei til eksport', async () => {
    const { user } = renderApp({ data: withOneOfEach() })
    const notice = await screen.findByRole('complementary', { name: 'Om lagring' })
    await user.click(within(notice).getByRole('button', { name: 'Eksporter nå' }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [fileName, text] = vi.mocked(downloadTextFile).mock.calls[0]!
    expect(JSON.parse(text)).toEqual(withOneOfEach())
    expect(screen.getByRole('status')).toHaveTextContent(`Eksportert til ${fileName}.`)
  })

  it('tilbyr ikke eksport når det ikke finnes noe å eksportere', async () => {
    renderApp()
    const notice = await screen.findByRole('complementary', { name: 'Om lagring' })
    expect(within(notice).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('første gangs bruk (K22)', () => {
  it('leder en ny bruker fra tom app til første risiko uten blindveier', async () => {
    const { user, repository } = renderApp()

    // 1. Tom app: registeret forklarer hva som mangler.
    await heading('Risikoregister')
    const guide = screen.getByRole('region', { name: 'Kom i gang' })
    await user.click(within(guide).getByRole('link', { name: 'Risikoeiere' }))

    // 2. Første eier. Deretter peker siden videre til temaer.
    await heading('Risikoeiere')
    expect(screen.queryByText('Neste steg:')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ny risikoeier' }))
    await user.type(screen.getByLabelText('Navn'), 'Kari Nordmann{Enter}')
    await screen.findByRole('rowheader', { name: 'Kari Nordmann' })
    const toThemes = screen.getByText('Neste steg:').parentElement!
    expect(toThemes).toHaveTextContent(
      'Neste steg: opprett minst ett risikotema under Risikotemaer.',
    )
    await user.click(within(toThemes).getByRole('link', { name: 'Risikotemaer' }))

    // 3. Første tema, deretter områder.
    await heading('Risikotemaer')
    await user.click(screen.getByRole('button', { name: 'Nytt tema' }))
    await user.type(screen.getByLabelText('Navn'), 'Leverandør{Enter}')
    await screen.findByRole('rowheader', { name: 'Leverandør' })
    const toAreas = screen.getByText('Neste steg:').parentElement!
    await user.click(within(toAreas).getByRole('link', { name: 'Risikoområder' }))

    // 4. Første område, deretter registeret.
    await heading('Risikoområder')
    await user.click(screen.getByRole('button', { name: 'Nytt område' }))
    await user.type(screen.getByLabelText('Navn'), 'IT')
    await user.selectOptions(screen.getByLabelText('Når?'), '0 - 3 år')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    await screen.findByRole('rowheader', { name: 'IT' })
    const toRegister = screen.getByText('Neste steg:').parentElement!
    expect(toRegister).toHaveTextContent('registrer den første risikoen i Risikoregister.')
    await user.click(within(toRegister).getByRole('link', { name: 'Risikoregister' }))

    // 5. Registeret er klart for første risiko.
    await heading('Risikoregister')
    expect(screen.queryByRole('region', { name: 'Kom i gang' })).not.toBeInTheDocument()
    expect(screen.getByText(/Ingen risikoer er registrert ennå/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ny risiko' }))
    const dialog = screen.getByRole('dialog', { name: 'Ny risiko' })
    await user.type(within(dialog).getByLabelText('Tittel'), 'Leverandør går konkurs')
    await user.selectOptions(within(dialog).getByLabelText('Risikoeier'), 'Kari Nordmann')
    await user.selectOptions(within(dialog).getByLabelText('Tema'), 'Leverandør')
    await user.selectOptions(within(dialog).getByLabelText('Område'), 'IT')
    await user.selectOptions(within(dialog).getByLabelText('Sannsynlighet'), '3 – Moderat')
    await user.selectOptions(within(dialog).getByLabelText('Konsekvens'), '4 – Alvorlig')
    await user.click(within(dialog).getByRole('button', { name: 'Lagre' }))

    expect(screen.getByRole('rowheader', { name: 'Leverandør går konkurs' })).toBeInTheDocument()
    expect((await repository.load()).risks).toHaveLength(1)

    // 6. Ferdig: ingen flere «neste steg».
    await user.click(
      within(screen.getByRole('navigation', { name: 'Hovedmeny' })).getByRole('link', {
        name: 'Risikoeiere',
      }),
    )
    await heading('Risikoeiere')
    expect(screen.queryByText('Neste steg:')).not.toBeInTheDocument()
  })

  it('peker til første manglende register, også når de opprettes i annen rekkefølge', async () => {
    renderApp({
      route: '/omrader',
      data: { ...withOneOfEach(), owners: [], themes: [] },
    })
    await heading('Risikoområder')
    expect(screen.getByText('Neste steg:').parentElement).toHaveTextContent(
      'Neste steg: opprett minst én risikoeier under Risikoeiere.',
    )
  })

  it('viser ikke «neste steg» til siden man allerede står på', async () => {
    renderApp({ route: '/temaer', data: { ...withOneOfEach(), themes: [] } })
    await heading('Risikotemaer')
    expect(screen.queryByText('Neste steg:')).not.toBeInTheDocument()
    expect(screen.getByText(/Ingen risikotemaer er registrert ennå/)).toBeInTheDocument()
  })

  it('leder fra tom matrise til registeret', async () => {
    const { user } = renderApp({ route: '/matrise' })
    await heading('Risikomatrise')
    await user.click(screen.getByRole('link', { name: 'risikoregisteret' }))
    expect(await heading('Risikoregister')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kom i gang' })).toBeInTheDocument()
  })
})
