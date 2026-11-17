import type { Rating } from './schema.ts'
import { level, LEVEL_MATRIX, RATINGS, score } from './scoring.ts'

// Tabellen fra spec K10, skrevet rad for rad slik den står der
// (sannsynlighet 5 øverst, konsekvens 1–5 mot høyre).
const EXPECTED: [Rating, number[]][] = [
  [5, [2, 2, 3, 3, 3]],
  [4, [1, 2, 2, 3, 3]],
  [3, [1, 2, 2, 2, 3]],
  [2, [1, 1, 2, 2, 2]],
  [1, [1, 1, 1, 2, 2]],
]

const allCells = EXPECTED.flatMap(([likelihood, row]) =>
  row.map((expected, index) => ({
    likelihood,
    consequence: (index + 1) as Rating,
    expected,
  })),
)

describe('score', () => {
  it('er sannsynlighet ganger konsekvens', () => {
    expect(score(1, 1)).toBe(1)
    expect(score(3, 4)).toBe(12)
    expect(score(5, 5)).toBe(25)
  })
})

describe('level', () => {
  it('dekker alle 25 kombinasjoner', () => {
    expect(allCells).toHaveLength(25)
  })

  it.each(allCells)(
    'sannsynlighet $likelihood, konsekvens $consequence gir nivå $expected',
    ({ likelihood, consequence, expected }) => {
      expect(level(likelihood, consequence)).toBe(expected)
    },
  )

  it('har unntaket fra referansebildet: 1×4 er nivå 2, mens 4×1 er nivå 1', () => {
    expect(level(1, 4)).toBe(2)
    expect(level(4, 1)).toBe(1)
  })

  it('følger ellers score-grensene 1–4, 5–12 og 15–25', () => {
    for (const likelihood of RATINGS) {
      for (const consequence of RATINGS) {
        if (likelihood === 1 && consequence === 4) continue
        const s = score(likelihood, consequence)
        const expected = s <= 4 ? 1 : s <= 12 ? 2 : 3
        expect(LEVEL_MATRIX[likelihood][consequence]).toBe(expected)
      }
    }
  })

  it('synker aldri når sannsynlighet eller konsekvens øker', () => {
    for (const likelihood of RATINGS) {
      for (const consequence of RATINGS) {
        const current = level(likelihood, consequence)
        if (likelihood < 5) {
          expect(level((likelihood + 1) as Rating, consequence)).toBeGreaterThanOrEqual(current)
        }
        if (consequence < 5) {
          expect(level(likelihood, (consequence + 1) as Rating)).toBeGreaterThanOrEqual(current)
        }
      }
    }
  })
})
