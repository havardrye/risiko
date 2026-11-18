import { screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { downloadTextFile } from '../download.ts'

vi.mock('../download.ts', () => ({ downloadTextFile: vi.fn() }))

function current(): AppData {
  return {
    schemaVersion: 2,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks: [
      {
        id: 'r1',
        title: 'Leverandør går konkurs',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 2,
        consequence: 5,
        createdAt: '2026-11-17T10:00:00.000Z',
        updatedAt: '2026-11-17T10:00:00.000Z',
      },
    ],
  }
}

function imported(): AppData {
  return {
    schemaVersion: 2,
    owners: [
      { id: 'x1', name: 'Per Hansen' },
      { id: 'x2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 'y1', name: 'Sikkerhet' }],
    areas: [{ id: 'z1', name: 'Økonomi', horizon: '0-3' }],
    risks: [
      {
        id: 'q1',
        title: 'Datainnbrudd',
        type: 'threat',
        ownerId: 'x1',
        themeId: 'y1',
        areaId: 'z1',
        likelihood: 4,
        consequence: 5,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 'q2',
        title: 'Ny støtteordning',
        type: 'opportunity',
        ownerId: 'x2',
        themeId: 'y1',
        areaId: 'z1',
        likelihood: 3,
        consequence: 4,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    ],
  }
}

function jsonFile(content: unknown, name = 'risikoregister-2026-10-01.json') {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return new File([text], name, { type: 'application/json' })
}

async function openApp() {
  const app = renderApp({ route: '/', data: current() })
  await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
  const fileInput = screen.getByTestId('import-file') as HTMLInputElement
  return { ...app, fileInput }
}

beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear()
})

describe('eksport (K20)', () => {
  it('laster ned alle data som JSON med dato i filnavnet', async () => {
    const { user } = await openApp()
    await user.click(screen.getByRole('button', { name: 'Eksporter' }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [fileName, text] = vi.mocked(downloadTextFile).mock.calls[0]!
    expect(fileName).toMatch(/^risikoregister-\d{4}-\d{2}-\d{2}\.json$/)
    expect(JSON.parse(text)).toEqual(current())
    expect(screen.getByRole('status')).toHaveTextContent(`Eksportert til ${fileName}.`)
  })
})

describe('import (K20, K21)', () => {
  it('viser hva som erstattes og erstatter alle data etter bekreftelse', async () => {
    const { user, fileInput, repository } = await openApp()
    await user.upload(fileInput, jsonFile(imported()))

    const dialog = await screen.findByRole('dialog', { name: 'Erstatte alle data?' })
    expect(within(dialog).getByText(/«risikoregister-2026-10-01.json»/)).toBeInTheDocument()
    expect(within(dialog).getByText('Erstattes').nextElementSibling).toHaveTextContent(
      '1 risiko, 1 eier, 1 tema, 1 område',
    )
    expect(within(dialog).getByText('Fra filen').nextElementSibling).toHaveTextContent(
      '2 risikoer, 2 eiere, 1 tema, 1 område',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Erstatt alle data' }))

    expect(await repository.load()).toEqual(imported())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Datainnbrudd' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'Leverandør går konkurs' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Importert: 2 risikoer, 2 eiere, 1 tema, 1 område.',
    )
  })

  it('endrer ingenting når brukeren avbryter', async () => {
    const { user, fileInput, repository } = await openApp()
    const save = vi.spyOn(repository, 'save')
    await user.upload(fileInput, jsonFile(imported()))
    await user.click(await screen.findByRole('button', { name: 'Avbryt' }))

    expect(save).not.toHaveBeenCalled()
    expect(await repository.load()).toEqual(current())
    expect(screen.getByRole('rowheader', { name: 'Leverandør går konkurs' })).toBeInTheDocument()
  })

  it('avviser en fil som ikke er JSON, uten å endre data', async () => {
    const { user, fileInput, repository } = await openApp()
    const save = vi.spyOn(repository, 'save')
    await user.upload(fileInput, jsonFile('Tittel;Eier\nBrann;Kari', 'eksport.csv'))

    const dialog = await screen.findByRole('dialog', { name: 'Kan ikke importere filen' })
    expect(within(dialog).getByText(/«eksport.csv» ble ikke importert/)).toBeInTheDocument()
    expect(within(dialog).getByText('Innholdet er ikke gyldig JSON.')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Lukk' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await repository.load()).toEqual(current())
  })

  it('avviser en fil med ødelagte referanser og viser detaljene', async () => {
    const { user, fileInput, repository } = await openApp()
    const save = vi.spyOn(repository, 'save')
    await user.upload(fileInput, jsonFile({ ...imported(), owners: [] }))

    const dialog = await screen.findByRole('dialog', { name: 'Kan ikke importere filen' })
    expect(within(dialog).getByText('Innholdet henger ikke sammen.')).toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Risikoen «Datainnbrudd» viser til risikoeier som ikke finnes.',
      'Risikoen «Ny støtteordning» viser til risikoeier som ikke finnes.',
    ])
    expect(save).not.toHaveBeenCalled()
  })

  it('avviser en tom fil', async () => {
    const { user, fileInput } = await openApp()
    await user.upload(fileInput, jsonFile(''))
    const dialog = await screen.findByRole('dialog', { name: 'Kan ikke importere filen' })
    expect(within(dialog).getByText('Filen er tom.')).toBeInTheDocument()
  })

  it('kan velge samme fil på nytt etter å ha avbrutt', async () => {
    const { user, fileInput } = await openApp()
    const file = jsonFile(imported())
    await user.upload(fileInput, file)
    await user.click(await screen.findByRole('button', { name: 'Avbryt' }))

    expect(fileInput.value).toBe('')
    await user.upload(fileInput, file)
    expect(await screen.findByRole('dialog', { name: 'Erstatte alle data?' })).toBeInTheDocument()
  })

  it('åpner filvelgeren fra «Importer»', async () => {
    const { user, fileInput } = await openApp()
    const click = vi.spyOn(fileInput, 'click')
    await user.click(screen.getByRole('button', { name: 'Importer' }))
    expect(click).toHaveBeenCalledTimes(1)
  })
})
