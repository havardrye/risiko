import { screen, within } from '@testing-library/react'
import type { AppData, Risk } from '../../domain/schema.ts'
import { renderApp } from '../../test/renderApp.tsx'

function risk(overrides: Partial<Risk> & Pick<Risk, 'id'>): Risk {
  return {
    title: `Risiko ${overrides.id}`,
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

function data(risks: Risk[]): AppData {
  return {
    schemaVersion: 3,
    owners: [{ id: 'o1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks,
  }
}

async function openMatrix(risks: Risk[] = []) {
  const app = renderApp({ route: '/matrise', data: data(risks) })
  await screen.findByRole('heading', { level: 1, name: 'Risikomatrise' })
  return { ...app, table: screen.getByRole('table') }
}

/** Datacellene (ikke overskriftene) i raden for en sannsynlighet. */
function cellsInRow(table: HTMLElement, likelihood: number) {
  const header = within(table).getByRole('rowheader', { name: new RegExp(`^${likelihood} `) })
  const row = header.closest('tr')
  if (!row) throw new Error(`Fant ikke rad ${likelihood}`)
  return within(row).getAllByRole('cell')
}

/** Det synlige tallet i en celle (tomt for tomme celler). */
function visibleCount(cell: HTMLElement) {
  return cell.querySelector('[aria-hidden="true"]')?.textContent ?? ''
}

describe('risikomatrise (K6, K7)', () => {
  it('har sannsynlighet på radene med 5 øverst', async () => {
    const { table } = await openMatrix()
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['5 Svært høy', '4 Høy', '3 Moderat', '2 Lav', '1 Svært lav'])
  })

  it('har mulighet 5→1 til venstre og trussel 1→5 til høyre, med skalatekster', async () => {
    const { table } = await openMatrix()
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      '5 Svært verdifull',
      '4 Verdifull',
      '3 Moderat',
      '2 Liten',
      '1 Ubetydelig',
      '1 Ubetydelig',
      '2 Liten',
      '3 Moderat',
      '4 Alvorlig',
      '5 Svært alvorlig',
      'Mulighet',
      'Trussel',
    ])
  })

  it('har 5 × 10 celler, og tomme celler viser ikke tall men har tilgjengelig navn', async () => {
    const { table } = await openMatrix()
    for (const likelihood of [1, 2, 3, 4, 5]) {
      const cells = cellsInRow(table, likelihood)
      expect(cells).toHaveLength(10)
      for (const cell of cells) {
        expect(visibleCount(cell)).toBe('')
        expect(cell).toHaveAccessibleName(/0 risikoer$/)
      }
    }
  })

  it('plasserer trussel (4,5) lengst til høyre på rad 4, i rødt (akseptkriterium)', async () => {
    const { table } = await openMatrix([risk({ id: 'r1', likelihood: 4, consequence: 5 })])
    const cells = cellsInRow(table, 4)

    expect(cells.map(visibleCount)).toEqual(['', '', '', '', '', '', '', '', '', '1'])
    expect(cells[9]).toHaveAccessibleName(
      'Trussel, sannsynlighet 4 Høy, konsekvens 5 Svært alvorlig, nivå Høy, 1 risiko',
    )
    expect(cells[9]).toHaveStyle({ backgroundColor: '#d50000' })
  })

  it('plasserer mulighet (4,5) lengst til venstre på rad 4, i mørk blå (akseptkriterium)', async () => {
    const { table } = await openMatrix([
      risk({ id: 'r1', type: 'opportunity', likelihood: 4, consequence: 5 }),
    ])
    const cells = cellsInRow(table, 4)

    expect(cells.map(visibleCount)).toEqual(['1', '', '', '', '', '', '', '', '', ''])
    expect(cells[0]).toHaveAccessibleName(
      'Mulighet, sannsynlighet 4 Høy, konsekvens 5 Svært verdifull, nivå Stor, 1 risiko',
    )
    expect(cells[0]).toHaveStyle({ backgroundColor: '#215f9a' })
  })

  it('gir trussel (1,4) nivå Middels i gult (akseptkriterium)', async () => {
    const { table } = await openMatrix([risk({ id: 'r1', likelihood: 1, consequence: 4 })])
    const cell = cellsInRow(table, 1)[8]

    expect(cell).toHaveAccessibleName(
      'Trussel, sannsynlighet 1 Svært lav, konsekvens 4 Alvorlig, nivå Middels, 1 risiko',
    )
    expect(cell).toHaveStyle({ backgroundColor: '#ffff00' })
  })

  it('teller flere risikoer i samme celle', async () => {
    const { table } = await openMatrix([
      risk({ id: 'r1', likelihood: 3, consequence: 2 }),
      risk({ id: 'r2', likelihood: 3, consequence: 2 }),
      risk({ id: 'r3', likelihood: 3, consequence: 2, type: 'opportunity' }),
    ])
    const cells = cellsInRow(table, 3)
    expect(cells.map(visibleCount)).toEqual(['', '', '', '1', '', '', '2', '', '', ''])
    expect(cells[6]).toHaveAccessibleName(/2 risikoer$/)
    expect(screen.getByText('3 risikoer i matrisen')).toBeInTheDocument()
  })

  it('farger cellene etter referansebildet', async () => {
    const { table } = await openMatrix()
    const colorOf = (cell: HTMLElement) => cell.style.background
    const grid = [5, 4, 3, 2, 1].map((likelihood) => cellsInRow(table, likelihood).map(colorOf))

    const D = 'rgb(33, 95, 154)' // mørk blå, Stor
    const B = 'rgb(15, 158, 213)' // blå, Middels
    const L = 'rgb(220, 230, 242)' // lys blå, Liten
    const G = 'rgb(78, 167, 46)' // grønn, Lav
    const Y = 'rgb(255, 255, 0)' // gul, Middels
    const R = 'rgb(213, 0, 0)' // rød, Høy
    expect(grid).toEqual([
      [D, D, D, B, B, Y, Y, R, R, R],
      [D, D, B, B, L, G, Y, Y, R, R],
      [D, B, B, B, L, G, Y, Y, Y, R],
      [B, B, B, L, L, G, G, Y, Y, Y],
      [B, B, L, L, L, G, G, G, Y, Y],
    ])
  })

  it('har fargeforklaring med navn på nivåene', async () => {
    await openMatrix()
    const legend = document.querySelector('dl[aria-label="Fargeforklaring"]')
    if (!legend) throw new Error('Fant ikke fargeforklaring')
    expect(legend).toHaveTextContent('TrusselLavMiddelsHøyMulighetLitenMiddelsStor')
  })

  it('viser veiledning når det ikke finnes risikoer', async () => {
    await openMatrix()
    expect(screen.getByText(/Ingen risikoer er registrert ennå/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'risikoregisteret' })).toBeInTheDocument()
  })
})
