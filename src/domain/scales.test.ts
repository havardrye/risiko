import {
  CONSEQUENCE_LABELS,
  consequenceLabel,
  LEVEL_STYLES,
  levelStyle,
  LIKELIHOOD_LABELS,
  likelihoodLabel,
  RISK_TYPE_LABELS,
  RISK_TYPES,
} from './scales.ts'
import { LEVELS, RATINGS } from './scoring.ts'

/** Relativ luminans etter WCAG 2.x for en farge på formen #rrggbb. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const [r, g, b] = channels as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

describe('skalatekster', () => {
  it('har tekst for alle sannsynlighetsverdier', () => {
    expect(RATINGS.map((r) => LIKELIHOOD_LABELS[r])).toEqual([
      'Svært lav',
      'Lav',
      'Moderat',
      'Høy',
      'Svært høy',
    ])
  })

  it('har egne konsekvenstekster for trussel og mulighet', () => {
    expect(RATINGS.map((r) => CONSEQUENCE_LABELS.threat[r])).toEqual([
      'Ubetydelig',
      'Liten',
      'Moderat',
      'Alvorlig',
      'Svært alvorlig',
    ])
    expect(RATINGS.map((r) => CONSEQUENCE_LABELS.opportunity[r])).toEqual([
      'Ubetydelig',
      'Liten',
      'Moderat',
      'Verdifull',
      'Svært verdifull',
    ])
  })

  it('viser tall og tekst sammen', () => {
    expect(likelihoodLabel(4)).toBe('4 – Høy')
    expect(consequenceLabel('threat', 5)).toBe('5 – Svært alvorlig')
    expect(consequenceLabel('opportunity', 5)).toBe('5 – Svært verdifull')
  })

  it('har navn på begge typer', () => {
    expect(RISK_TYPE_LABELS).toEqual({ threat: 'Trussel', opportunity: 'Mulighet' })
  })
})

describe('nivåer', () => {
  it('har navnene fra spec K10', () => {
    expect(LEVELS.map((l) => levelStyle('threat', l).name)).toEqual(['Lav', 'Middels', 'Høy'])
    expect(LEVELS.map((l) => levelStyle('opportunity', l).name)).toEqual([
      'Liten',
      'Middels',
      'Stor',
    ])
  })

  const styles = RISK_TYPES.flatMap((type) =>
    LEVELS.map((l) => ({ type, level: l, ...LEVEL_STYLES[type][l] })),
  )

  it.each(styles)(
    '$type nivå $level har tekstkontrast på minst 4,5:1',
    ({ background, text }) => {
      expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('bruker ulik farge for hvert nivå og hver type', () => {
    const backgrounds = styles.map((s) => s.background)
    expect(new Set(backgrounds).size).toBe(backgrounds.length)
  })
})
