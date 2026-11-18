import { screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { importExcel } from '../data/excel/index.ts'
import type { AppData, Risk } from '../domain/schema.ts'
import { renderApp } from '../test/renderApp.tsx'

// Excel-lesingen er testet for seg (data/excel); her gjelder det dialogene (spec 002).
vi.mock('../data/excel/index.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/excel/index.ts')>()),
  importExcel: vi.fn(),
}))

/**
 * Automatisk tilgjengelighetssjekk med axe-core på alle sidene og de
 * viktigste tilstandene. Fargekontrast kan ikke måles i jsdom; den er sjekket
 * i nettleser (se T20 i tasks.md) og for nivåfargene i domain/scales.test.ts.
 */

async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  })
  return result.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
}

function risk(overrides: Partial<Risk> & Pick<Risk, 'id' | 'title'>): Risk {
  return {
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 4,
    consequence: 5,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  }
}

function seed(): AppData {
  return {
    schemaVersion: 2,
    owners: [{ id: 'o1', name: 'Kari Nordmann', email: 'kari@example.com' }],
    themes: [{ id: 't1', name: 'Leverandør', description: 'Avhengighet av eksterne' }],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks: [
      risk({ id: 'r1', title: 'Datainnbrudd' }),
      risk({ id: 'r2', title: 'Ny støtteordning', type: 'opportunity', likelihood: 3 }),
    ],
  }
}

describe('tilgjengelighet (axe)', () => {
  it.each([
    ['/', 'Risikoregister'],
    ['/matrise', 'Risikomatrise'],
    ['/eiere', 'Risikoeiere'],
    ['/temaer', 'Risikotemaer'],
    ['/omrader', 'Risikoområder'],
    ['/finnes-ikke', 'Fant ikke siden'],
  ])('%s med data har ingen brudd', async (route, title) => {
    renderApp({ route, data: seed() })
    await screen.findByRole('heading', { level: 1, name: title })
    expect(await violations()).toEqual([])
  })

  it('tom app har ingen brudd', async () => {
    renderApp()
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    expect(await violations()).toEqual([])
  })

  it('risikoskjema med feilmeldinger har ingen brudd', async () => {
    const { user } = renderApp({ data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    await user.click(screen.getByRole('button', { name: 'Ny risiko' }))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(await violations()).toEqual([])
  })

  it('matrise med valgt celle har ingen brudd', async () => {
    const { user } = renderApp({ route: '/matrise', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
    await user.click(screen.getByRole('button', { name: /^Trussel, sannsynlighet 4/ }))
    expect(await violations()).toEqual([])
  })

  it('sperret sletting har ingen brudd', async () => {
    const { user } = renderApp({ route: '/eiere', data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoeiere' })
    await user.click(screen.getByRole('button', { name: 'Slett Kari Nordmann' }))
    expect(await violations()).toEqual([])
  })

  it('eksportdialogen har ingen brudd (spec 002)', async () => {
    const { user } = renderApp({ data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    await user.click(screen.getByRole('button', { name: 'Eksporter' }))
    expect(within(screen.getByRole('dialog', { name: 'Eksporter' })).getAllByRole('button')).toHaveLength(4)
    expect(await violations()).toEqual([])
  })

  it('feildialogen etter Excel-import har ingen brudd (spec 002)', async () => {
    vi.mocked(importExcel).mockResolvedValue({
      ok: false,
      message: 'Filen har 1 feil. Rett den i Excel og importer på nytt.',
      details: ['Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»'],
    })
    const { user } = renderApp({ data: seed() })
    await screen.findByRole('heading', { level: 1, name: 'Risikoregister' })
    await user.upload(
      screen.getByTestId('import-file'),
      new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'register.xlsx'),
    )
    await screen.findByRole('dialog', { name: 'Kan ikke importere filen' })
    expect(await violations()).toEqual([])
  })
})
