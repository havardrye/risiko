import { screen, waitFor, within } from '@testing-library/react'
import { excelTemplate, exportExcel, importExcel } from '../../data/excel/index.ts'
import type { AppData } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { downloadBlob, downloadTextFile } from '../download.ts'

vi.mock('../download.ts', () => ({ downloadTextFile: vi.fn(), downloadBlob: vi.fn() }))
// Excel-lesingen selv er testet med ekte filer i data/excel; her gjelder det menyen.
vi.mock('../../data/excel/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/excel/index.ts')>()),
  importExcel: vi.fn(),
  exportExcel: vi.fn(),
  excelTemplate: vi.fn(),
}))

function current(): AppData {
  return {
    schemaVersion: 6,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT' }],
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
    schemaVersion: 6,
    owners: [
      { id: 'x1', name: 'Per Hansen' },
      { id: 'x2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 'y1', name: 'Sikkerhet' }],
    areas: [{ id: 'z1', name: 'Økonomi' }],
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
  vi.mocked(importExcel).mockReset()
  vi.mocked(downloadBlob).mockClear()
  vi.mocked(exportExcel).mockReset()
  vi.mocked(excelTemplate).mockReset()
})

describe('eksport (K20)', () => {
  it('laster ned alle data som JSON med dato i filnavnet', async () => {
    const { user } = await openApp()
    await user.click(screen.getByRole('button', { name: 'Eksporter' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Eksporter' })).getByRole('button', {
        name: 'Sikkerhetskopi (JSON)',
      }),
    )

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

// --- Excel (spec 002, T32) ---

/** En .xlsx-fil starter med zip-signaturen «PK»; innholdet ellers spiller ingen rolle her. */
function xlsxFile(name = 'risikoregister.xlsx') {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14])], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Datasett med `count` risikoer, alle på samme eier, tema og område. */
function withRisks(count: number, prefix: string): AppData {
  const base = current()
  return {
    ...base,
    risks: Array.from({ length: count }, (_, index) => ({
      ...base.risks[0],
      id: `${prefix}${index + 1}`,
      title: `${prefix === 'r' ? 'Gammel' : 'Ny'} risiko ${index + 1}`,
    })),
  }
}

async function openAppWith(data: AppData) {
  const app = renderApp({ route: '/', data })
  await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
  return { ...app, fileInput: screen.getByTestId('import-file') as HTMLInputElement }
}

describe('import fra Excel (K26, K28, K31, K32)', () => {
  it('tar imot både JSON- og Excel-filer i filvelgeren', async () => {
    const { fileInput } = await openApp()
    expect(fileInput.accept).toContain('.json')
    expect(fileInput.accept).toContain('.xlsx')
  })

  it('erstatter 5 risikoer med de 3 fra filen etter bekreftelse (akseptkriterium)', async () => {
    vi.mocked(importExcel).mockResolvedValue({ ok: true, data: withRisks(3, 'n') })
    const { user, fileInput, repository } = await openAppWith(withRisks(5, 'r'))
    await user.upload(fileInput, xlsxFile())

    const dialog = await screen.findByRole('dialog', { name: 'Erstatte alle data?' })
    expect(importExcel).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByText(/«risikoregister.xlsx»/)).toBeInTheDocument()
    expect(within(dialog).getByText('Erstattes').nextElementSibling).toHaveTextContent('5 risikoer')
    expect(within(dialog).getByText('Fra filen').nextElementSibling).toHaveTextContent('3 risikoer')
    expect(within(dialog).getByText(/Eksporter først/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Erstatt alle data' }))

    const saved = await repository.load()
    expect(saved.risks.map((risk) => risk.title)).toEqual(['Ny risiko 1', 'Ny risiko 2', 'Ny risiko 3'])
    expect(screen.getByRole('status')).toHaveTextContent('Importert: 3 risikoer')
  })

  it('endrer ingenting når brukeren avbryter', async () => {
    vi.mocked(importExcel).mockResolvedValue({ ok: true, data: withRisks(3, 'n') })
    const { user, fileInput, repository } = await openAppWith(withRisks(5, 'r'))
    const save = vi.spyOn(repository, 'save')
    await user.upload(fileInput, xlsxFile())
    await user.click(await screen.findByRole('button', { name: 'Avbryt' }))

    expect(save).not.toHaveBeenCalled()
    expect((await repository.load()).risks).toHaveLength(5)
  })

  it('viser feilene med fane, rad og kolonne, og endrer ingenting (K28)', async () => {
    vi.mocked(importExcel).mockResolvedValue({
      ok: false,
      message: 'Filen har 2 feil. Rett dem i Excel og importer på nytt.',
      details: [
        'Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»',
        'Temaer, rad 3, Område-ID: Ingen område har ID «O-9» i fanen «Områder»',
      ],
    })
    const { user, fileInput, repository } = await openApp()
    const save = vi.spyOn(repository, 'save')
    await user.upload(fileInput, xlsxFile('mitt register.xlsx'))

    const dialog = await screen.findByRole('dialog', { name: 'Kan ikke importere filen' })
    expect(within(dialog).getByText(/«mitt register.xlsx» ble ikke importert/)).toBeInTheDocument()
    expect(within(dialog).getByText('Filen har 2 feil. Rett dem i Excel og importer på nytt.')).toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»',
      'Temaer, rad 3, Område-ID: Ingen område har ID «O-9» i fanen «Områder»',
    ])
    expect(save).not.toHaveBeenCalled()
  })

  it('melder at filen leses og sperrer knappene så lenge', async () => {
    let finish: (value: Awaited<ReturnType<typeof importExcel>>) => void = () => {}
    vi.mocked(importExcel).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { user, fileInput } = await openApp()
    await user.upload(fileInput, xlsxFile())

    expect(await screen.findByRole('status')).toHaveTextContent('Leser Excel-fil …')
    expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eksporter' })).toBeDisabled()

    finish({ ok: true, data: imported() })
    expect(await screen.findByRole('dialog', { name: 'Erstatte alle data?' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importer' })).toBeEnabled())
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('bruker ikke Excel-lesingen for JSON-filer', async () => {
    const { user, fileInput } = await openApp()
    await user.upload(fileInput, jsonFile(imported()))
    expect(await screen.findByRole('dialog', { name: 'Erstatte alle data?' })).toBeInTheDocument()
    expect(importExcel).not.toHaveBeenCalled()
  })
})

describe('eksportdialogen (K33, K34, K35)', () => {
  async function openExport() {
    const app = await openApp()
    await app.user.click(screen.getByRole('button', { name: 'Eksporter' }))
    return { ...app, dialog: screen.getByRole('dialog', { name: 'Eksporter' }) }
  }

  it('har tre valg med forklaring', async () => {
    const { dialog } = await openExport()
    const choices = within(dialog).getAllByRole('listitem').map((item) => within(item).getByRole('button'))
    expect(choices.map((button) => button.textContent)).toEqual([
      'Excel (for redigering)',
      'Sikkerhetskopi (JSON)',
      'Tom Excel-mal',
    ])
    expect(choices[0]).toHaveAccessibleDescription(
      /^Alle data i en Excel-fil du kan redigere og importere igjen\./,
    )
    expect(choices[2]).toHaveAccessibleDescription('En tom Excel-fil med riktige faner, kolonner og nedtrekkslister.')
  })

  it('laster ned alle data som Excel med dato i filnavnet (K35)', async () => {
    const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    vi.mocked(exportExcel).mockResolvedValue(blob)
    const { user, dialog } = await openExport()
    await user.click(within(dialog).getByRole('button', { name: 'Excel (for redigering)' }))

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1))
    expect(exportExcel).toHaveBeenCalledWith(current())
    const [fileName, file] = vi.mocked(downloadBlob).mock.calls[0]!
    expect(fileName).toMatch(/^risikoregister-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect(file).toBe(blob)
    expect(screen.getByRole('status')).toHaveTextContent(`Eksportert til ${fileName}.`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(downloadTextFile).not.toHaveBeenCalled()
  })

  it('laster ned den tomme malen (K33)', async () => {
    const blob = new Blob(['mal'])
    vi.mocked(excelTemplate).mockResolvedValue(blob)
    const { user, dialog } = await openExport()
    await user.click(within(dialog).getByRole('button', { name: 'Tom Excel-mal' }))

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith('risikoregister-mal.xlsx', blob))
    expect(screen.getByRole('status')).toHaveTextContent('Malen er lastet ned: risikoregister-mal.xlsx.')
  })

  it('melder fra når Excel-filen ikke kan lages', async () => {
    vi.mocked(exportExcel).mockRejectedValue(new Error('offline'))
    const { user, dialog } = await openExport()
    await user.click(within(dialog).getByRole('button', { name: 'Excel (for redigering)' }))

    expect(await screen.findByText(/Excel-filen kunne ikke lages/)).toBeInTheDocument()
    expect(downloadBlob).not.toHaveBeenCalled()
  })

  it('lukker uten å laste ned noe ved Avbryt', async () => {
    const { user, dialog } = await openExport()
    await user.click(within(dialog).getByRole('button', { name: 'Avbryt' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(downloadTextFile).not.toHaveBeenCalled()
  })

  it('lar snarveien i lagringsvarselet eksportere JSON direkte (K34)', async () => {
    const { user } = await openApp()
    await user.click(screen.getByRole('button', { name: 'Eksporter nå' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    expect(vi.mocked(downloadTextFile).mock.calls[0]![0]).toMatch(/\.json$/)
  })
})

describe('advarsel om manglende ID ved Excel-eksport (spec 004, K54)', () => {
  function withAllCodes(): AppData {
    const data = current()
    return {
      ...data,
      owners: data.owners.map((item) => ({ ...item, code: 'E-1' })),
      themes: data.themes.map((item) => ({ ...item, code: 'T-1' })),
      areas: data.areas.map((item) => ({ ...item, code: 'O-1' })),
      risks: data.risks.map((item) => ({ ...item, code: 'R-1' })),
    }
  }

  async function openExportWith(data: AppData) {
    const app = renderApp({ route: '/', data })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    await app.user.click(screen.getByRole('button', { name: 'Eksporter' }))
    return { ...app, dialog: screen.getByRole('dialog', { name: 'Eksporter' }) }
  }

  it('viser ingen advarsel når alt har ID', async () => {
    const { dialog } = await openExportWith(withAllCodes())
    expect(within(dialog).queryByText(/mangler ID/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Excel (for redigering)' })).toHaveAccessibleDescription(
      'Alle data i en Excel-fil du kan redigere og importere igjen.',
    )
  })

  it('advarer under Excel-valget når noe mangler ID, og kobler advarselen til knappen', async () => {
    const { dialog } = await openExportWith(current())
    const warning = '4 elementer mangler ID. Filen kan ikke importeres igjen før de har fått det.'
    expect(within(dialog).getByText(warning)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Excel (for redigering)' })).toHaveAccessibleDescription(
      `Alle data i en Excel-fil du kan redigere og importere igjen. ${warning}`,
    )
    expect(within(dialog).getByRole('button', { name: 'Sikkerhetskopi (JSON)' })).toHaveAccessibleDescription(
      'Alle data nøyaktig slik de er lagret. Bruk denne til sikkerhetskopi.',
    )
  })

  it('bruker entall når ett element mangler ID', async () => {
    const data = withAllCodes()
    const { code: _code, ...legacy } = data.risks[0]!
    data.risks = [legacy]
    const { dialog } = await openExportWith(data)
    expect(
      within(dialog).getByText('1 element mangler ID. Filen kan ikke importeres igjen før det har fått det.'),
    ).toBeInTheDocument()
  })

  it('sperrer ikke eksporten', async () => {
    vi.mocked(exportExcel).mockResolvedValue(new Blob(['xlsx']))
    const { user, dialog } = await openExportWith(current())
    await user.click(within(dialog).getByRole('button', { name: 'Excel (for redigering)' }))
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1))
  })
})
