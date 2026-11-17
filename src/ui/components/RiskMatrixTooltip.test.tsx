import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Risk } from '../../domain/schema.ts'
import { RiskMatrix } from './RiskMatrix.tsx'

// Om tipset faktisk vises ved hover styres av CSS, som jsdom ikke tegner.
// Her testes innholdet, plasseringen og at Escape skjuler tipsene.

function risk(id: string, overrides: Partial<Risk> = {}): Risk {
  return {
    id,
    title: `Risiko ${id}`,
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

function cellNamed(name: RegExp) {
  return screen.getByRole('cell', { name })
}

function tooltipOf(cell: HTMLElement) {
  return within(cell).getByTestId('cell-tooltip')
}

describe('verktøytips i matrisen', () => {
  it('finnes i alle 50 celler og er skjult for skjermlesere', () => {
    render(<RiskMatrix risks={[]} />)
    const tooltips = screen.getAllByTestId('cell-tooltip')
    expect(tooltips).toHaveLength(50)
    for (const tooltip of tooltips) expect(tooltip).toHaveAttribute('aria-hidden', 'true')
  })

  it('viser type, nivå, skala og titlene på risikoene i cellen', () => {
    render(
      <RiskMatrix
        risks={[
          risk('a', { title: 'Datainnbrudd' }),
          risk('b', { title: 'Phishing' }),
        ]}
        onSelectCell={() => {}}
      />,
    )
    const tooltip = tooltipOf(cellNamed(/^Trussel, sannsynlighet 4 Høy, konsekvens 5/))
    expect(Array.from(tooltip.children).map((child) => child.textContent)).toEqual([
      'Trussel · nivå Høy',
      'Sannsynlighet 4 høy',
      'Konsekvens 5 svært alvorlig',
      '• Datainnbrudd• Phishing',
      'Klikk for å se detaljer',
    ])
  })

  it('viser «Ingen risikoer» i tomme celler, uten klikkhint', () => {
    render(<RiskMatrix risks={[]} onSelectCell={() => {}} />)
    const tooltip = tooltipOf(cellNamed(/^Mulighet, sannsynlighet 1 Svært lav, konsekvens 1/))
    expect(tooltip).toHaveTextContent('Mulighet · nivå Liten')
    expect(tooltip).toHaveTextContent('Ingen risikoer')
    expect(tooltip).not.toHaveTextContent('Klikk')
  })

  it('viser de tre første titlene og oppsummerer resten', () => {
    render(<RiskMatrix risks={['a', 'b', 'c', 'd', 'e'].map((id) => risk(id))} />)
    const tooltip = tooltipOf(cellNamed(/^Trussel, sannsynlighet 4 Høy, konsekvens 5/))
    expect(tooltip).toHaveTextContent('• Risiko a• Risiko b• Risiko c')
    expect(tooltip).not.toHaveTextContent('Risiko d')
    expect(tooltip).toHaveTextContent('og 2 til')
  })

  it('påvirker ikke det tilgjengelige navnet til cellen', () => {
    render(<RiskMatrix risks={[risk('a', { title: 'Datainnbrudd' })]} onSelectCell={() => {}} />)
    expect(
      screen.getByRole('button', { name: /^Trussel, sannsynlighet 4 Høy/ }),
    ).toHaveAccessibleName(
      'Trussel, sannsynlighet 4 Høy, konsekvens 5 Svært alvorlig, nivå Høy, 1 risiko',
    )
  })

  it('plasseres slik at det holder seg innenfor matrisen', () => {
    render(<RiskMatrix risks={[]} />)
    const classesOf = (name: RegExp) => tooltipOf(cellNamed(name)).className
    // Øverste rad, lengst til venstre: under cellen og inntil venstre kant.
    expect(classesOf(/^Mulighet, sannsynlighet 5 Svært høy, konsekvens 5/)).toMatch(/tooltipBelow/)
    expect(classesOf(/^Mulighet, sannsynlighet 5 Svært høy, konsekvens 5/)).toMatch(/tooltipStart/)
    // Nederste rad, lengst til høyre: over cellen og inntil høyre kant.
    expect(classesOf(/^Trussel, sannsynlighet 1 Svært lav, konsekvens 5/)).toMatch(/tooltipAbove/)
    expect(classesOf(/^Trussel, sannsynlighet 1 Svært lav, konsekvens 5/)).toMatch(/tooltipEnd/)
  })

  it('skjules med Escape og kommer tilbake når pekeren flyttes til en celle', () => {
    render(<RiskMatrix risks={[risk('a')]} onSelectCell={() => {}} />)
    const table = screen.getByRole('table')
    const button = screen.getByRole('button', { name: /^Trussel/ })

    // Ved hover har ikke matrisen fokus, så Escape må virke uansett hvor fokus er.
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(table.className).toMatch(/tooltipsHidden/)

    fireEvent.pointerEnter(button.closest('td')!)
    expect(table.className).not.toMatch(/tooltipsHidden/)
  })
})
