import {
  AREA_SHEET,
  DATA_SHEETS,
  findColumns,
  findSheetName,
  GUIDE_SHEET_NAME,
  OWNER_SHEET,
  RATING_CHOICES,
  RISK_INFO_COLUMNS,
  RISK_SHEET,
  RISK_TYPE_CHOICES,
  THEME_SHEET,
  type SheetSpec,
} from './excelFormat.ts'

/** Overskrift og påkrevd, slik tabellene i spec 002 viser dem. */
function described(sheet: SheetSpec) {
  return sheet.columns.map((column) => [column.header, column.required])
}

describe('Excel-formatet (K26)', () => {
  it('har fanene i rekkefølgen Risikoer, Eiere, Temaer, Områder', () => {
    expect(DATA_SHEETS.map((sheet) => sheet.name)).toEqual(['Risikoer', 'Eiere', 'Temaer', 'Områder'])
    expect(GUIDE_SHEET_NAME).toBe('Veiledning')
  })

  it('har kolonnene for Eiere fra spec-en', () => {
    expect(described(OWNER_SHEET)).toEqual([
      ['ID', true],
      ['Navn', true],
      ['E-post', false],
    ])
  })

  it('har kolonnene for Temaer fra spec-en', () => {
    expect(described(THEME_SHEET)).toEqual([
      ['ID', true],
      ['Navn', true],
      ['Område-ID', true],
      ['Beskrivelse', false],
    ])
  })

  it('har kolonnene for Områder fra spec-en', () => {
    expect(described(AREA_SHEET)).toEqual([
      ['ID', true],
      ['Navn', true],
      ['Beskrivelse', false],
    ])
  })

  it('har kolonnene for Risikoer fra spec-en', () => {
    expect(described(RISK_SHEET)).toEqual([
      ['ID', true],
      ['Tittel', true],
      ['Beskrivelse', false],
      ['Type', true],
      ['Eier-ID', true],
      ['Tema-ID', true],
      ['Område-ID', true],
      ['Sannsynlighet', true],
      ['Konsekvens', true],
    ])
  })

  it('har faste valg med de samme tekstene som appen', () => {
    expect(RISK_TYPE_CHOICES).toEqual(['Trussel', 'Mulighet'])
    expect(RATING_CHOICES).toEqual(['1', '2', '3', '4', '5'])

    const choices = (sheet: SheetSpec, header: string) =>
      sheet.columns.find((column) => column.header === header)?.choices
    expect(choices(RISK_SHEET, 'Type')).toBe(RISK_TYPE_CHOICES)
    expect(choices(RISK_SHEET, 'Sannsynlighet')).toBe(RATING_CHOICES)
    expect(choices(RISK_SHEET, 'Konsekvens')).toBe(RATING_CHOICES)
    expect(AREA_SHEET.columns.some((column) => column.choices)).toBe(false)
  })

  it('har informasjonskolonnene Score, Nivå, Eier, Tema og Område utenfor importformatet (K35, K61)', () => {
    expect(RISK_INFO_COLUMNS.map((column) => column.header)).toEqual(['Score', 'Nivå', 'Eier', 'Tema', 'Område'])
    const importHeaders = RISK_SHEET.columns.map((column) => column.header)
    for (const header of ['Score', 'Nivå', 'Eier', 'Tema', 'Område']) expect(importHeaders).not.toContain(header)
  })
})

describe('findColumns', () => {
  it('finner kolonnene i vilkårlig rekkefølge', () => {
    const { indexes, missing } = findColumns(['E-post', 'Navn', 'ID'], OWNER_SHEET)
    expect(indexes).toEqual({ code: 2, name: 1, email: 0 })
    expect(missing).toEqual([])
  })

  it('leser «e-post » som «E-post» (akseptkriterium)', () => {
    expect(findColumns(['Navn', 'e-post '], OWNER_SHEET).indexes.email).toBe(1)
  })

  it('tåler store bokstaver og doble mellomrom', () => {
    expect(findColumns(['  NAVN', 'beskrivelse '], AREA_SHEET).indexes).toEqual({ name: 0, description: 1 })
  })

  it('ignorerer ukjente kolonner', () => {
    const lookup = findColumns(['Notat', 'ID', 'Navn', 'Score', 'Område-ID'], THEME_SHEET)
    expect(lookup.indexes).toEqual({ code: 1, name: 2, area: 4 })
    expect(lookup.missing).toEqual([])
  })

  it('melder påkrevde kolonner som mangler, men ikke valgfrie', () => {
    const { missing } = findColumns(['Navn', 'Beskrivelse'], AREA_SHEET)
    expect(missing.map((column) => column.header)).toEqual(['ID'])
  })

  it('melder kolonner som står to ganger', () => {
    const { indexes, duplicates } = findColumns(['Navn', 'navn'], OWNER_SHEET)
    expect(duplicates.map((column) => column.header)).toEqual(['Navn'])
    expect(indexes.name).toBeUndefined()
  })
})

describe('ID-kolonnen (spec 004, K51)', () => {
  it('står først og er påkrevd i alle fire faner', () => {
    for (const sheet of DATA_SHEETS) {
      expect(sheet.columns[0]).toMatchObject({ key: 'code', header: 'ID', required: true })
    }
  })
})

describe('findSheetName', () => {
  it('finner fanen uten hensyn til store bokstaver og mellomrom', () => {
    expect(findSheetName(['Veiledning', ' risikoer '], 'Risikoer')).toBe(' risikoer ')
    expect(findSheetName(['OMRÅDER'], 'Områder')).toBe('OMRÅDER')
  })

  it('gir undefined når fanen mangler', () => {
    expect(findSheetName(['Eiere', 'Temaer'], 'Risikoer')).toBeUndefined()
  })
})
