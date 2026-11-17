import { screen, within } from '@testing-library/react'
import { MemoryRepository } from './data/memoryRepository.ts'
import { StoredDataError } from './data/repository.ts'
import { emptyAppData } from './domain/schema.ts'
import { renderApp } from './test/renderApp.tsx'
import { downloadTextFile } from './ui/download.ts'

vi.mock('./ui/download.ts', () => ({ downloadTextFile: vi.fn() }))

const PAGES = [
  ['/', 'Risikoregister'],
  ['/matrise', 'Risikomatrise'],
  ['/eiere', 'Risikoeiere'],
  ['/temaer', 'Risikotemaer'],
  ['/omrader', 'Risikoområder'],
] as const

function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

describe('app-skall', () => {
  it('viser lastetilstand til data er lest', async () => {
    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent('Laster')
    await heading('Risikoregister')
    expect(screen.queryByText(/Laster/)).not.toBeInTheDocument()
  })

  it.each(PAGES)('viser riktig side på adressen %s', async (route, title) => {
    renderApp({ route })
    expect(await heading(title)).toBeInTheDocument()
    expect(document.title).toBe(`${title} – Risikostyring`)
  })

  it('har en hovedmeny med de fem sidene i rekkefølge', async () => {
    renderApp()
    await heading('Risikoregister')
    const nav = screen.getByRole('navigation', { name: 'Hovedmeny' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(
      PAGES.map(([, title]) => title),
    )
  })

  it('bytter side ved klikk i menyen og markerer gjeldende side', async () => {
    const { user } = renderApp()
    await heading('Risikoregister')
    const nav = screen.getByRole('navigation', { name: 'Hovedmeny' })

    await user.click(within(nav).getByRole('link', { name: 'Risikomatrise' }))

    expect(await heading('Risikomatrise')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Risikomatrise' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Risikoregister' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('kan navigeres med tastatur: hopp-lenke først, deretter menyen', async () => {
    const { user } = renderApp()
    await heading('Risikoregister')

    await user.tab()
    expect(screen.getByRole('link', { name: 'Hopp til innhold' })).toHaveFocus()

    const nav = screen.getByRole('navigation', { name: 'Hovedmeny' })
    for (const [, title] of PAGES) {
      await user.tab()
      expect(within(nav).getByRole('link', { name: title })).toHaveFocus()
    }

    await user.keyboard('{Enter}')
    expect(await heading('Risikoområder')).toBeInTheDocument()
  })

  it('viser en egen side for ukjent adresse, med vei tilbake', async () => {
    const { user } = renderApp({ route: '/finnes-ikke' })
    expect(await heading('Fant ikke siden')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'risikoregisteret' }))
    expect(await heading('Risikoregister')).toBeInTheDocument()
  })
})

describe('feilside for lagrede data som ikke kan leses', () => {
  const RAW = '{"schemaVersion":1,"owners":[ødelagt'

  function brokenRepository() {
    const repository = new MemoryRepository()
    vi.spyOn(repository, 'load').mockRejectedValue(
      new StoredDataError('Innholdet har ugyldige felt.', RAW, [
        'risks.0.likelihood: Velg en verdi fra 1 til 5',
      ]),
    )
    return repository
  }

  it('viser årsak og detaljer i stedet for sidene', async () => {
    renderApp({ repository: brokenRepository() })

    expect(await heading('Kan ikke lese lagrede data')).toBeInTheDocument()
    expect(screen.getByText('Innholdet har ugyldige felt.')).toBeInTheDocument()
    expect(screen.getByText('risks.0.likelihood: Velg en verdi fra 1 til 5')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('lar brukeren laste ned innholdet slik det ligger lagret', async () => {
    const { user } = renderApp({ repository: brokenRepository() })
    await heading('Kan ikke lese lagrede data')

    await user.click(screen.getByRole('button', { name: 'Last ned lagret innhold' }))

    expect(downloadTextFile).toHaveBeenCalledWith('risikoregister-uleselig.txt', RAW, 'text/plain')
  })

  it('overskriver ingenting før brukeren har bekreftet', async () => {
    const repository = brokenRepository()
    const save = vi.spyOn(repository, 'save')
    const { user } = renderApp({ repository })
    await heading('Kan ikke lese lagrede data')

    await user.click(screen.getByRole('button', { name: 'Start med tomt register' }))
    const dialog = screen.getByRole('dialog', { name: 'Starte med tomt register?' })
    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }))

    expect(save).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kan ikke lese lagrede data' })).toBeInTheDocument()
  })

  it('starter med tomt register etter bekreftelse', async () => {
    const repository = brokenRepository()
    const save = vi.spyOn(repository, 'save')
    const { user } = renderApp({ repository })
    await heading('Kan ikke lese lagrede data')

    await user.click(screen.getByRole('button', { name: 'Start med tomt register' }))
    await user.click(screen.getByRole('button', { name: 'Erstatt med tomt register' }))

    expect(await heading('Risikoregister')).toBeInTheDocument()
    expect(save).toHaveBeenCalledWith(emptyAppData())
  })

  it('leser på nytt når brukeren ber om det', async () => {
    const repository = new MemoryRepository()
    vi.spyOn(repository, 'load').mockRejectedValueOnce(new StoredDataError('Ugyldig', '{'))
    const { user } = renderApp({ repository })
    await heading('Kan ikke lese lagrede data')

    await user.click(screen.getByRole('button', { name: 'Prøv å lese på nytt' }))

    expect(await heading('Risikoregister')).toBeInTheDocument()
  })

  it('tilbyr ikke nedlasting når feilen ikke gjelder innholdet', async () => {
    const repository = new MemoryRepository()
    vi.spyOn(repository, 'load').mockRejectedValue(new Error('Ingen tilgang til lagring'))
    renderApp({ repository })

    expect(await heading('Kan ikke lese lagrede data')).toBeInTheDocument()
    expect(screen.getByText('Det oppsto en uventet feil ved lesing.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Last ned lagret innhold' })).not.toBeInTheDocument()
  })
})
