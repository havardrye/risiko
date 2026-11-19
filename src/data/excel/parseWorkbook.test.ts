import {
  interpretRating,
  interpretRiskType,
  parseSheets,
  parseWorkbook,
  type ExcelImportResult,
} from './parseWorkbook.ts'
import { formatCellError, type CellValue, type WorkbookRows } from './workbookRows.ts'

/**
 * Lager en arbeidsbok som i Excel: første rad er overskrifter (rad 1),
 * datarader får radnummer 2, 3, … i den rekkefølgen de står.
 */
function workbook(sheets: Record<string, CellValue[][]>): WorkbookRows {
  return Object.fromEntries(
    Object.entries(sheets).map(([name, [headers = [], ...rows]]) => [
      name,
      {
        headers: headers.map((header) => String(header ?? '')),
        rows: rows.map((cells, index) => ({ rowNumber: index + 2, cells })),
      },
    ]),
  )
}

const RISK_HEADERS = [
  'Tittel',
  'Beskrivelse',
  'Type',
  'Eier-ID',
  'Tema-ID',
  'Område-ID',
  'Sannsynlighet',
  'Konsekvens',
]

const DATA_SHEETS = ['risikoer', 'eiere', 'temaer', 'områder']
const REFERENCE_SHEETS: Record<string, string> = { 'eier-id': 'eiere', 'tema-id': 'temaer', 'område-id': 'områder' }
const isBlank = (cell: CellValue | undefined) => cell === null || cell === undefined || String(cell).trim() === ''
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('nb')

/**
 * Gjør testfilene lette å skrive og lese:
 * 1. Datafanene får en ID-kolonne først (spec 004) med unike ID-er, f.eks.
 *    «Ri-1», «Ei-2». Faner som allerede har ID-kolonne, og helt tomme rader,
 *    blir stående som de er.
 * 2. I Risikoer kan Eier-ID, Tema-ID og Område-ID skrives med *navn*
 *    (spec 005). Navn som finnes i fanen de viser til, byttes ut med ID-en
 *    der. Andre verdier blir stående, så tester av ukjente ID-er virker.
 * Tester av selve kolonnene bruker `workbook()` direkte.
 */
function withCodes(sheets: Record<string, CellValue[][]>): Record<string, CellValue[][]> {
  const coded = Object.fromEntries(
    Object.entries(sheets).map(([name, [headers = [], ...rows]]) => {
      const isData = DATA_SHEETS.includes(norm(name))
      const hasCode = headers.some((header) => norm(header) === 'id')
      if (!isData || hasCode) return [name, [headers, ...rows]]
      const prefix = name.trim().slice(0, 2)
      return [
        name,
        [
          ['ID', ...headers],
          ...rows.map((cells, index) => [cells.every(isBlank) ? null : `${prefix}-${index + 1}`, ...cells]),
        ],
      ]
    }),
  ) as Record<string, CellValue[][]>

  // Navn → ID i fanene Eiere, Temaer og Områder.
  const codeByName = (sheetName: string) => {
    const entry = Object.entries(coded).find(([name]) => norm(name) === sheetName)
    if (!entry) return new Map<string, CellValue>()
    const [headers = [], ...rows] = entry[1]
    const codeAt = headers.findIndex((header) => norm(header) === 'id')
    const nameAt = headers.findIndex((header) => norm(header) === 'navn')
    return new Map(rows.filter((row) => !isBlank(row[codeAt])).map((row) => [norm(row[nameAt]), row[codeAt] ?? null]))
  }

  return Object.fromEntries(
    Object.entries(coded).map(([name, [headers = [], ...rows]]) => {
      if (norm(name) !== 'risikoer') return [name, [headers, ...rows]]
      const translations = headers.map((header) => {
        const target = REFERENCE_SHEETS[norm(header)]
        return target ? codeByName(target) : undefined
      })
      return [
        name,
        [
          headers,
          ...rows.map((cells) =>
            cells.map((cell, index) => translations[index]?.get(norm(cell)) ?? cell),
          ),
        ],
      ]
    }),
  )
}

/** En gyldig fil med én av hvert; `overrides` erstatter hele faner. */
function validFile(overrides: Record<string, CellValue[][]> = {}): WorkbookRows {
  return workbook(withCodes({
    Veiledning: [['Slik fyller du ut'], ['…']],
    Risikoer: [
      RISK_HEADERS,
      ['Leverandør går konkurs', 'Viktig leverandør', 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 2, 5],
    ],
    Eiere: [['Navn', 'E-post'], ['Kari Nordmann', 'kari@example.no']],
    Temaer: [['Navn', 'Beskrivelse'], ['Leverandør', null]],
    Områder: [['Navn', 'Når?', 'Beskrivelse'], ['IT', '0 - 3 år', 'Drift og utvikling']],
    ...overrides,
  }))
}

/** Feilene som tekst, slik brukeren ser dem. */
function errorsOf(file: WorkbookRows): string[] {
  return parseSheets(file).errors.map(formatCellError)
}

describe('parseSheets – gyldig fil', () => {
  it('leser alle fire faner med radnummer', () => {
    const result = parseSheets(validFile())
    expect(result.errors).toEqual([])
    expect(result.owners).toEqual([{ rowNumber: 2, value: { code: 'Ei-1', name: 'Kari Nordmann', email: 'kari@example.no' } }])
    expect(result.themes).toEqual([{ rowNumber: 2, value: { code: 'Te-1', name: 'Leverandør' } }])
    expect(result.areas).toEqual([
      { rowNumber: 2, value: { code: 'Om-1', name: 'IT', description: 'Drift og utvikling' } },
    ])
    expect(result.risks).toEqual([
      {
        rowNumber: 2,
        value: {
          code: 'Ri-1',
          title: 'Leverandør går konkurs',
          description: 'Viktig leverandør',
          type: 'threat',
          owner: 'Ei-1',
          theme: 'Te-1',
          area: 'Om-1',
          likelihood: 2,
          consequence: 5,
        },
      },
    ])
  })

  it('godtar kolonner i annen rekkefølge, store bokstaver og mellomrom (K26)', () => {
    const file = validFile({ ' eiere': [['e-post ', 'NAVN'], ['ola@example.no', 'Ola']] })
    delete file.Eiere
    const result = parseSheets(file)
    expect(result.errors).toEqual([])
    expect(result.owners[0].value).toEqual({ code: 'ei-1', name: 'Ola', email: 'ola@example.no' })
  })

  it('ignorerer ukjente faner og kolonner (K26)', () => {
    const result = parseSheets(
      validFile({
        Notater: [['Hva'], ['Husk møtet']],
        Temaer: [['Navn', 'Ansvarlig avdeling'], ['Leverandør', 'Innkjøp']],
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.themes[0].value).toEqual({ code: 'Te-1', name: 'Leverandør' })
  })

  it('trimmer tekst og lar tomme valgfrie felt være tomme', () => {
    const result = parseSheets(validFile({ Temaer: [['Navn', 'Beskrivelse'], ['  Leverandør  ', '   ']] }))
    expect(result.themes[0].value).toEqual({ code: 'Te-1', name: 'Leverandør' })
  })

  it('godtar tall som tekst og tall som tall', () => {
    const result = parseSheets(
      validFile({
        Risikoer: [RISK_HEADERS, ['A', null, 'mulighet', 'Kari Nordmann', 'Leverandør', 'IT', '3', 4]],
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.risks[0].value).toMatchObject({ type: 'opportunity', likelihood: 3, consequence: 4 })
  })

  it('godtar en tittel som er et tall', () => {
    const result = parseSheets(
      validFile({ Risikoer: [RISK_HEADERS, [2026, null, 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1]] }),
    )
    expect(result.risks[0].value.title).toBe('2026')
  })
})

describe('parseSheets – tomme rader (K30)', () => {
  it('hopper over rader der alle kjente kolonner er tomme', () => {
    const result = parseSheets(
      validFile({
        Eiere: [
          ['ID', 'Navn', 'E-post', 'Notat'],
          [null, null, null, null],
          ['E-1', 'Kari Nordmann', null, null],
          [' ', '  ', '', 'bare et notat'],
          [],
          ['E-2', 'Ola Nordmann', null, null],
        ],
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.owners.map((row) => [row.rowNumber, row.value.name])).toEqual([
      [3, 'Kari Nordmann'],
      [6, 'Ola Nordmann'],
    ])
  })

  it('godtar en fane uten datarader', () => {
    const result = parseSheets(validFile({ Temaer: [['Navn', 'Beskrivelse']] }))
    expect(result.errors).toEqual([])
    expect(result.themes).toEqual([])
  })
})

describe('parseSheets – faner og kolonner (K30)', () => {
  it('melder en fane som mangler (akseptkriterium)', () => {
    const file = validFile()
    delete file.Risikoer
    expect(errorsOf(file)).toEqual(['Risikoer: Fanen «Risikoer» mangler'])
  })

  it('melder hver påkrevd kolonne som mangler, én gang, og leser ikke radene', () => {
    const result = parseSheets(
      validFile({ Områder: [['ID', 'Beskrivelse'], ['O-1', null], ['O-2', null]] }),
    )
    expect(result.errors.map(formatCellError)).toEqual(['Områder, Navn: Kolonnen «Navn» mangler'])
    expect(result.areas).toEqual([])
  })

  it('godtar at valgfrie kolonner mangler', () => {
    const result = parseSheets(validFile({ Eiere: [['Navn'], ['Kari Nordmann']] }))
    expect(result.errors).toEqual([])
    expect(result.owners[0].value).toEqual({ code: 'Ei-1', name: 'Kari Nordmann' })
  })

  it('melder en kolonne som står to ganger', () => {
    expect(errorsOf(validFile({ Eiere: [['Navn', 'navn'], ['Kari', 'Ola']] }))).toEqual([
      'Eiere, Navn: Kolonnen «Navn» står flere ganger',
    ])
  })
})

describe('parseSheets – ugyldige verdier (K28)', () => {
  it('melder manglende påkrevde felt med fane, rad og kolonne', () => {
    const errors = errorsOf(
      validFile({
        Risikoer: [
          RISK_HEADERS,
          ['OK', null, 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1],
          [null, 'bare beskrivelse', null, null, null, null, null, null],
        ],
      }),
    )
    expect(errors).toEqual([
      'Risikoer, rad 3, Tittel: Tittel er påkrevd',
      'Risikoer, rad 3, Type: Type er påkrevd',
      'Risikoer, rad 3, Eier-ID: Eier-ID er påkrevd',
      'Risikoer, rad 3, Tema-ID: Tema-ID er påkrevd',
      'Risikoer, rad 3, Område-ID: Område-ID er påkrevd',
      'Risikoer, rad 3, Sannsynlighet: Sannsynlighet er påkrevd',
      'Risikoer, rad 3, Konsekvens: Konsekvens er påkrevd',
    ])
  })

  it('melder ugyldig type', () => {
    expect(
      errorsOf(
        validFile({ Risikoer: [RISK_HEADERS, ['A', null, 'Fare', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1]] }),
      ),
    ).toEqual(['Risikoer, rad 2, Type: «Fare» er ikke en lovlig verdi. Bruk «Trussel» eller «Mulighet».'])
  })

  it('melder sannsynlighet og konsekvens utenfor 1–5 eller ikke heltall', () => {
    expect(
      errorsOf(
        validFile({
          Risikoer: [RISK_HEADERS, ['A', null, 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 6, 2.5]],
        }),
      ),
    ).toEqual([
      'Risikoer, rad 2, Sannsynlighet: «6» er ikke en lovlig verdi. Bruk et heltall fra 1 til 5.',
      'Risikoer, rad 2, Konsekvens: «2.5» er ikke en lovlig verdi. Bruk et heltall fra 1 til 5.',
    ])
  })

  it('melder ugyldig e-post', () => {
    expect(errorsOf(validFile({ Eiere: [['Navn', 'E-post'], ['Kari', 'kari(at)example.no']] }))).toEqual([
      'Eiere, rad 2, E-post: Ugyldig e-postadresse',
    ])
  })

  it('melder et celleproblem fra lesingen, f.eks. en formelfeil', () => {
    expect(
      errorsOf(validFile({ Temaer: [['Navn'], [{ problem: 'Cellen har en formelfeil (#REF!).' }]] })),
    ).toEqual(['Temaer, rad 2, Navn: Cellen har en formelfeil (#REF!).'])
  })

  it('tar ikke med rader som har feil, men leser resten', () => {
    const result = parseSheets(
      validFile({ Eiere: [['Navn', 'E-post'], ['Kari', null], ['Ola', 'ugyldig'], ['Per', null]] }),
    )
    expect(result.owners.map((row) => row.value.name)).toEqual(['Kari', 'Per'])
    expect(result.errors).toHaveLength(1)
  })

  it('samler feil fra flere faner', () => {
    const file = validFile({ Eiere: [['Navn', 'E-post'], ['Kari', 'ugyldig']] })
    delete file.Temaer
    expect(errorsOf(file)).toEqual([
      'Eiere, rad 2, E-post: Ugyldig e-postadresse',
      'Temaer: Fanen «Temaer» mangler',
    ])
  })
})

describe('tolking av verdier', () => {
  it('type uten hensyn til store og små bokstaver', () => {
    expect(interpretRiskType('TRUSSEL')).toEqual({ ok: true, value: 'threat' })
    expect(interpretRiskType('Mulighet')).toEqual({ ok: true, value: 'opportunity' })
  })

  it('tall 1–5 som tall eller tekst', () => {
    expect(interpretRating(1)).toEqual({ ok: true, value: 1 })
    expect(interpretRating('5')).toEqual({ ok: true, value: 5 })
    for (const value of [0, 6, 2.5, '3,0', 'tre', '-1']) {
      expect(interpretRating(value).ok).toBe(false)
    }
  })
})

// --- T28: helheten ---

const NOW = new Date('2026-11-18T12:00:00.000Z')

/** Fast tidspunkt og forutsigbare id-er (id1, id2, …). */
function parse(file: WorkbookRows): ExcelImportResult {
  let counter = 0
  return parseWorkbook(file, { now: NOW, newId: () => `id${++counter}` })
}

function failures(file: WorkbookRows): string[] {
  const result = parse(file)
  return result.ok ? [] : result.errors.map(formatCellError)
}

describe('parseWorkbook – gyldig fil (K26)', () => {
  it('gir riktig datasett for 3 eiere, 2 temaer, 2 områder og 10 risikoer (akseptkriterium)', () => {
    const owners = ['Kari Nordmann', 'Ola Nordmann', 'Per Hansen']
    const themes = ['Leverandør', 'Informasjonssikkerhet']
    const areas = ['IT', 'Økonomi']
    const riskRows: CellValue[][] = Array.from({ length: 10 }, (_, index) => [
      `Risiko ${index + 1}`,
      null,
      index % 2 === 0 ? 'Trussel' : 'Mulighet',
      owners[index % 3],
      themes[index % 2],
      areas[(index + 1) % 2],
      (index % 5) + 1,
      5 - (index % 5),
    ])
    const result = parse(
      validFile({
        Risikoer: [RISK_HEADERS, ...riskRows],
        Eiere: [['Navn'], ...owners.map((name) => [name])],
        Temaer: [['Navn'], ...themes.map((name) => [name])],
        Områder: [['Navn', 'Når?'], ['IT', '0 - 3 år'], ['Økonomi', '5 år +']],
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { data } = result
    expect([data.owners.length, data.themes.length, data.areas.length, data.risks.length]).toEqual([
      3, 2, 2, 10,
    ])
    expect(data.schemaVersion).toBe(6)

    const nameOf = (list: readonly { id: string; name: string }[], id: string) =>
      list.find((item) => item.id === id)?.name
    data.risks.forEach((risk, index) => {
      expect(risk.title).toBe(`Risiko ${index + 1}`)
      expect(nameOf(data.owners, risk.ownerId)).toBe(owners[index % 3])
      expect(nameOf(data.themes, risk.themeId)).toBe(themes[index % 2])
      expect(nameOf(data.areas, risk.areaId)).toBe(areas[(index + 1) % 2])
      expect(risk.likelihood).toBe((index % 5) + 1)
      expect(risk.type).toBe(index % 2 === 0 ? 'threat' : 'opportunity')
    })
  })

  it('gir nye id-er og setter datoene til importtidspunktet', () => {
    const result = parse(validFile())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { owners, themes, areas, risks } = result.data
    const ids = [...owners, ...themes, ...areas, ...risks].map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(risks[0]).toMatchObject({
      createdAt: '2026-11-18T12:00:00.000Z',
      updatedAt: '2026-11-18T12:00:00.000Z',
    })
  })

  it('finner eier, tema og område på ID uten hensyn til store bokstaver og mellomrom (spec 005)', () => {
    const result = parse(
      validFile({
        Risikoer: [RISK_HEADERS, ['A', null, 'Trussel', ' ei-1 ', 'te-1', 'OM-1', 1, 1]],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.risks[0].ownerId).toBe(result.data.owners[0].id)
  })

  it('lager id-er med crypto.randomUUID som standard', () => {
    const result = parseWorkbook(validFile())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.risks[0].id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('godtar en fil uten risikoer', () => {
    const result = parse(validFile({ Risikoer: [RISK_HEADERS] }))
    expect(result.ok && result.data.risks).toEqual([])
  })
})

describe('parseWorkbook – helheten (K28, K29)', () => {
  it('melder en eier som ikke finnes (akseptkriterium)', () => {
    expect(
      failures(
        validFile({
          Risikoer: [
            RISK_HEADERS,
            ['A', null, 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1],
            ['B', null, 'Trussel', 'E-9', 'Leverandør', 'IT', 1, 1],
          ],
        }),
      ),
    ).toEqual(['Risikoer, rad 3, Eier-ID: Ingen eier har ID «E-9» i fanen «Eiere»'])
  })

  it('melder tema og område som ikke finnes', () => {
    expect(
      failures(
        validFile({ Risikoer: [RISK_HEADERS, ['A', null, 'Trussel', 'Kari Nordmann', 'T-9', 'O-9', 1, 1]] }),
      ),
    ).toEqual([
      'Risikoer, rad 2, Tema-ID: Ingen tema har ID «T-9» i fanen «Temaer»',
      'Risikoer, rad 2, Område-ID: Ingen område har ID «O-9» i fanen «Områder»',
    ])
  })

  it('melder like navn i Temaer på begge radene (akseptkriterium)', () => {
    expect(failures(validFile({ Temaer: [['Navn'], ['Leverandør'], ['Lønn'], ['leverandør ']] }))).toEqual([
      'Temaer, rad 2, Navn: «Leverandør» står også på rad 4. Navn må være unike.',
      'Temaer, rad 4, Navn: «leverandør» står også på rad 2. Navn må være unike.',
    ])
  })

  it('nevner alle de andre radene når et navn står mer enn to ganger', () => {
    const errors = failures(
      validFile({ Eiere: [['Navn'], ['Kari Nordmann'], ['Kari Nordmann'], ['Kari Nordmann']] }),
    )
    expect(errors[0]).toBe(
      'Eiere, rad 2, Navn: «Kari Nordmann» står også på rad 3 og 4. Navn må være unike.',
    )
    expect(errors).toHaveLength(3)
  })

  it('gir ikke følgefeil når raden med navnet selv har feil', () => {
    expect(failures(validFile({ Eiere: [['Navn', 'E-post'], ['Kari Nordmann', 'ugyldig']] }))).toEqual([
      'Eiere, rad 2, E-post: Ugyldig e-postadresse',
    ])
  })

  it('gir ikke følgefeil når fanen mangler eller mangler kolonner', () => {
    const file = validFile({ Områder: [['ID', 'Beskrivelse'], ['O-1', 'Drift']] })
    delete file.Eiere
    expect(failures(file)).toEqual([
      'Eiere: Fanen «Eiere» mangler',
      'Områder, Navn: Kolonnen «Navn» mangler',
    ])
  })

  it('sorterer feilene etter fane og rad', () => {
    const errors = failures(
      validFile({
        Risikoer: [
          RISK_HEADERS,
          ['A', null, 'Trussel', 'E-9', 'Leverandør', 'IT', 1, 1],
          ['B', null, 'Fare', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1],
        ],
        Eiere: [['Navn', 'E-post'], ['Kari Nordmann', null], ['Per', 'ugyldig']],
      }),
    )
    expect(errors).toEqual([
      'Risikoer, rad 2, Eier-ID: Ingen eier har ID «E-9» i fanen «Eiere»',
      'Risikoer, rad 3, Type: «Fare» er ikke en lovlig verdi. Bruk «Trussel» eller «Mulighet».',
      'Eiere, rad 3, E-post: Ugyldig e-postadresse',
    ])
  })

  it('gir ok: false og ingen data når én eneste rad har feil (K28)', () => {
    const result = parse(
      validFile({ Temaer: [['Navn', 'Beskrivelse'], ['Leverandør', null], [null, 'mangler navn']] }),
    )
    expect(result).toEqual({
      ok: false,
      errors: [{ sheet: 'Temaer', row: 3, column: 'Navn', message: 'Navn er påkrevd' }],
    })
  })
})

describe('ID i Excel (spec 004, K51–K53)', () => {
  const HEADERS = ['ID', ...RISK_HEADERS]
  const row = (code: CellValue, title: string): CellValue[] => [
    code,
    title,
    null,
    'Trussel',
    'Kari Nordmann',
    'Leverandør',
    'IT',
    1,
    1,
  ]

  it('tar ID-ene med inn i datasettet', () => {
    const result = parse(validFile({ Risikoer: [HEADERS, row('R-007', 'A')] }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.risks[0]?.code).toBe('R-007')
    expect(result.data.owners[0]?.code).toBe('Ei-1')
  })

  it('melder to rader med samme ID i Risikoer på begge radene (akseptkriterium)', () => {
    expect(failures(validFile({ Risikoer: [HEADERS, row('R-3', 'A'), row('R-2', 'B'), row(' r-3', 'C')] }))).toEqual([
      'Risikoer, rad 2, ID: «R-3» står også på rad 4. ID må være unik.',
      'Risikoer, rad 4, ID: «r-3» står også på rad 2. ID må være unik.',
    ])
  })

  it('melder like ID-er i Eiere, og like navn for seg', () => {
    expect(
      failures(validFile({ Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann'], ['E-1', 'Per Hansen']] })),
    ).toEqual([
      'Eiere, rad 2, ID: «E-1» står også på rad 3. ID må være unik.',
      'Eiere, rad 3, ID: «E-1» står også på rad 2. ID må være unik.',
    ])
  })

  it('avviser en fil uten ID-kolonne (akseptkriterium, beslutning 6)', () => {
    const file = workbook({
      Risikoer: [RISK_HEADERS, ['A', null, 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1]],
      Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann']],
      Temaer: [['ID', 'Navn', 'Område-ID'], ['T-1', 'Leverandør', 'O-1']],
      Områder: [['ID', 'Navn', 'Når?'], ['O-1', 'IT', '0 - 3 år']],
    })
    expect(failures(file)).toEqual(['Risikoer, ID: Kolonnen «ID» mangler'])
  })

  it('melder tom ID og ID på mer enn 20 tegn med fane, rad og kolonne', () => {
    expect(failures(validFile({ Risikoer: [HEADERS, row(null, 'A'), row('x'.repeat(21), 'B')] }))).toEqual([
      'Risikoer, rad 2, ID: ID er påkrevd',
      'Risikoer, rad 3, ID: ID kan være høyst 20 tegn',
    ])
  })

  it('leser en ID som er et tall i Excel, som tekst', () => {
    const result = parse(validFile({ Risikoer: [HEADERS, row(7, 'A')] }))
    expect(result.ok && result.data.risks[0]?.code).toBe('7')
  })
})

describe('Risikoer viser til ID (spec 005, K60)', () => {
  it('avviser en fil med de gamle kolonnene Eier, Tema og Område (akseptkriterium)', () => {
    const file = workbook({
      Risikoer: [
        ['ID', 'Tittel', 'Type', 'Eier', 'Tema', 'Område', 'Sannsynlighet', 'Konsekvens'],
        ['R-1', 'A', 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 1, 1],
      ],
      Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann']],
      Temaer: [['ID', 'Navn', 'Område-ID'], ['T-1', 'Leverandør', 'O-1']],
      Områder: [['ID', 'Navn', 'Når?'], ['O-1', 'IT', '0 - 3 år']],
    })
    expect(failures(file)).toEqual([
      'Risikoer, Eier-ID: Kolonnen «Eier-ID» mangler',
      'Risikoer, Tema-ID: Kolonnen «Tema-ID» mangler',
      'Risikoer, Område-ID: Kolonnen «Område-ID» mangler',
    ])
  })

  it('godtar ikke navn i Eier-ID, selv om navnet finnes', () => {
    const file = workbook({
      Risikoer: [
        ['ID', 'Tittel', 'Type', 'Eier-ID', 'Tema-ID', 'Område-ID', 'Sannsynlighet', 'Konsekvens'],
        ['R-1', 'A', 'Trussel', 'Kari Nordmann', 'T-1', 'O-1', 1, 1],
      ],
      Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann']],
      Temaer: [['ID', 'Navn', 'Område-ID'], ['T-1', 'Leverandør', 'O-1']],
      Områder: [['ID', 'Navn', 'Når?'], ['O-1', 'IT', '0 - 3 år']],
    })
    expect(failures(file)).toEqual(['Risikoer, rad 2, Eier-ID: Ingen eier har ID «Kari Nordmann» i fanen «Eiere»'])
  })

  it('ignorerer informasjonskolonnene Eier, Tema og Område ved import', () => {
    const file = workbook({
      Risikoer: [
        ['ID', 'Tittel', 'Type', 'Eier-ID', 'Tema-ID', 'Område-ID', 'Sannsynlighet', 'Konsekvens', 'Eier', 'Tema', 'Område'],
        ['R-1', 'A', 'Trussel', 'E-1', 'T-1', 'O-1', 1, 1, 'Feil navn', 'Feil tema', 'Feil område'],
      ],
      Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann']],
      Temaer: [['ID', 'Navn', 'Område-ID'], ['T-1', 'Leverandør', 'O-1']],
      Områder: [['ID', 'Navn', 'Når?'], ['O-1', 'IT', '0 - 3 år']],
    })
    const result = parse(file)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.risks[0]?.ownerId).toBe(result.data.owners[0]?.id)
  })
})

describe('Temaer uten område (spec 008, K79)', () => {
  const base = () => ({
    Risikoer: [
      ['ID', 'Tittel', 'Type', 'Eier-ID', 'Tema-ID', 'Område-ID', 'Sannsynlighet', 'Konsekvens'],
      ['R-1', 'A', 'Trussel', 'E-1', 'T-1', 'O-1', 1, 1],
    ] as CellValue[][],
    Eiere: [['ID', 'Navn'], ['E-1', 'Kari Nordmann']] as CellValue[][],
    Temaer: [['ID', 'Navn', 'Beskrivelse'], ['T-1', 'Leverandør', 'Avtaler']] as CellValue[][],
    Områder: [['ID', 'Navn'], ['O-1', 'IT'], ['O-2', 'Økonomi']] as CellValue[][],
  })

  it('importerer Temaer med ID, Navn og Beskrivelse', () => {
    const result = parse(workbook(base()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.themes).toEqual([{ id: expect.any(String), code: 'T-1', name: 'Leverandør', description: 'Avtaler' }])
    }
  })

  it('importerer en eldre fil med Område-ID og Område i Temaer og ignorerer kolonnene (akseptkriterium)', () => {
    const file = base()
    file.Temaer = [
      ['ID', 'Navn', 'Område-ID', 'Beskrivelse', 'Område'],
      ['T-1', 'Leverandør', 'O-2', 'Avtaler', 'Økonomi'],
      ['T-2', 'Omdømme', null, null, null],
    ]
    const result = parse(workbook(file))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.themes.map((theme) => theme.name)).toEqual(['Leverandør', 'Omdømme'])
      expect(result.data.themes.some((theme) => 'areaId' in theme)).toBe(false)
    }
  })

  it('godtar også en Område-ID som ingen har, siden kolonnen ikke leses (akseptkriterium)', () => {
    const file = base()
    file.Temaer = [['ID', 'Navn', 'Område-ID'], ['T-1', 'Leverandør', 'O-9']]
    expect(parse(workbook(file)).ok).toBe(true)
  })
})

describe('Områder uten «Når?» (spec 007, K74)', () => {
  it('importerer en eldre fil med kolonnen «Når?» og ignorerer den (akseptkriterium)', () => {
    const result = parse(
      validFile({ Områder: [['ID', 'Navn', 'Når?', 'Beskrivelse'], ['O-1', 'IT', 'tull', 'Drift']] }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.areas[0]).toEqual({ id: expect.any(String), code: 'O-1', name: 'IT', description: 'Drift' })
  })
})
