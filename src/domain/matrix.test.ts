import { buildMatrix, MATRIX_COLUMNS, type MatrixRow } from './matrix.ts'
import type { Rating, Risk } from './schema.ts'

function risk(overrides: Partial<Risk> & Pick<Risk, 'id'>): Risk {
  return {
    title: `Risiko ${overrides.id}`,
    type: 'threat',
    ownerId: 'o1',
    themeId: 't1',
    areaId: 'a1',
    likelihood: 1,
    consequence: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function rowFor(matrix: MatrixRow[], likelihood: Rating): MatrixRow {
  const row = matrix.find((r) => r.likelihood === likelihood)
  if (!row) throw new Error(`Fant ikke rad ${likelihood}`)
  return row
}

const counts = (row: MatrixRow) => row.cells.map((c) => c.risks.length)

describe('buildMatrix', () => {
  it('har 5 rader med høyest sannsynlighet øverst', () => {
    expect(buildMatrix([]).map((r) => r.likelihood)).toEqual([5, 4, 3, 2, 1])
  })

  it('har 10 kolonner: mulighet 5→1, deretter trussel 1→5', () => {
    expect(MATRIX_COLUMNS.map((c) => `${c.type}${c.consequence}`)).toEqual([
      'opportunity5',
      'opportunity4',
      'opportunity3',
      'opportunity2',
      'opportunity1',
      'threat1',
      'threat2',
      'threat3',
      'threat4',
      'threat5',
    ])
    for (const row of buildMatrix([])) {
      expect(row.cells.map(({ type, consequence }) => ({ type, consequence }))).toEqual(
        MATRIX_COLUMNS,
      )
      expect(row.cells.every((c) => c.likelihood === row.likelihood)).toBe(true)
    }
  })

  it('gir 0 risikoer i alle celler for tom liste', () => {
    const matrix = buildMatrix([])
    expect(matrix.flatMap((r) => r.cells)).toHaveLength(50)
    expect(matrix.flatMap(counts).every((n) => n === 0)).toBe(true)
  })

  it('plasserer trussel (4,5) lengst til høyre på rad 4', () => {
    const matrix = buildMatrix([risk({ id: 'r1', likelihood: 4, consequence: 5 })])
    expect(counts(rowFor(matrix, 4))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    expect(rowFor(matrix, 4).cells[9]?.level).toBe(3)
  })

  it('plasserer mulighet (4,5) lengst til venstre på rad 4', () => {
    const matrix = buildMatrix([
      risk({ id: 'r1', type: 'opportunity', likelihood: 4, consequence: 5 }),
    ])
    expect(counts(rowFor(matrix, 4))).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(rowFor(matrix, 4).cells[0]?.level).toBe(3)
  })

  it('holder trussel og mulighet med samme verdier i hver sin halvdel', () => {
    const matrix = buildMatrix([
      risk({ id: 't', type: 'threat', likelihood: 3, consequence: 1 }),
      risk({ id: 'o', type: 'opportunity', likelihood: 3, consequence: 1 }),
    ])
    // Konsekvens 1 ligger inn mot midten på begge sider.
    expect(counts(rowFor(matrix, 3))).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0, 0])
  })

  it('samler flere risikoer i samme celle og beholder rekkefølgen', () => {
    const matrix = buildMatrix([
      risk({ id: 'a', likelihood: 2, consequence: 3 }),
      risk({ id: 'b', likelihood: 5, consequence: 5 }),
      risk({ id: 'c', likelihood: 2, consequence: 3 }),
    ])
    const cell = rowFor(matrix, 2).cells[7]
    expect(cell?.risks.map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('plasserer hver risiko i nøyaktig én celle', () => {
    const risks = [
      risk({ id: 'a', likelihood: 1, consequence: 1 }),
      risk({ id: 'b', type: 'opportunity', likelihood: 5, consequence: 3 }),
      risk({ id: 'c', likelihood: 3, consequence: 4 }),
      risk({ id: 'd', type: 'opportunity', likelihood: 2, consequence: 2 }),
    ]
    const total = buildMatrix(risks)
      .flatMap(counts)
      .reduce((sum, n) => sum + n, 0)
    expect(total).toBe(risks.length)
  })

  it('gir cellene nivå fra tabellen i K10, speilet for muligheter', () => {
    const levels = buildMatrix([]).map((row) => row.cells.map((c) => c.level))
    expect(levels).toEqual([
      [3, 3, 3, 2, 2, 2, 2, 3, 3, 3],
      [3, 3, 2, 2, 1, 1, 2, 2, 3, 3],
      [3, 2, 2, 2, 1, 1, 2, 2, 2, 3],
      [2, 2, 2, 1, 1, 1, 1, 2, 2, 2],
      [2, 2, 1, 1, 1, 1, 1, 1, 2, 2],
    ])
  })
})
