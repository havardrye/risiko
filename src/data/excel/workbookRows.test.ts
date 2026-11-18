import { formatCellError, sortCellErrors, type CellError } from './workbookRows.ts'

describe('formatCellError (K28)', () => {
  it('viser fane, rad og kolonne', () => {
    expect(
      formatCellError({
        sheet: 'Risikoer',
        row: 7,
        column: 'Eier',
        message: '«Ola Nordman» finnes ikke i fanen «Eiere»',
      }),
    ).toBe('Risikoer, rad 7, Eier: «Ola Nordman» finnes ikke i fanen «Eiere»')
  })

  it('utelater det som ikke gjelder', () => {
    expect(formatCellError({ sheet: 'Områder', column: 'Når?', message: 'Kolonnen mangler' })).toBe(
      'Områder, Når?: Kolonnen mangler',
    )
    expect(formatCellError({ sheet: 'Risikoer', message: 'Fanen mangler' })).toBe(
      'Risikoer: Fanen mangler',
    )
  })
})

describe('sortCellErrors', () => {
  it('sorterer etter fane og så rad, og beholder rekkefølgen ellers', () => {
    const errors: CellError[] = [
      { sheet: 'Eiere', row: 4, message: 'a' },
      { sheet: 'Risikoer', row: 9, message: 'b' },
      { sheet: 'Risikoer', row: 2, column: 'Type', message: 'c' },
      { sheet: 'Risikoer', row: 2, column: 'Eier', message: 'd' },
      { sheet: 'Ukjent', message: 'e' },
      { sheet: 'Risikoer', message: 'f' },
    ]
    const sorted = sortCellErrors(errors, ['Risikoer', 'Eiere'])
    expect(sorted.map((error) => error.message)).toEqual(['f', 'c', 'd', 'b', 'a', 'e'])
  })
})
