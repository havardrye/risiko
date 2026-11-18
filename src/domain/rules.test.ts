import {
  countMissingCodes,
  countRisksBy,
  findIntegrityErrors,
  findMissingCodes,
  isCodeTaken,
  isNameTaken,
  normalizeName,
  risksReferencing,
} from './rules.ts'
import type { AppData, Risk } from './schema.ts'

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

const owners = [
  { id: 'o1', name: 'Kari Nordmann' },
  { id: 'o2', name: 'Ola Åsen' },
]

function validData(): AppData {
  return {
    schemaVersion: 3,
    owners,
    themes: [
      { id: 't1', name: 'Leverandør' },
      { id: 't2', name: 'Sikkerhet' },
    ],
    areas: [
      { id: 'a1', name: 'IT', horizon: '0-3' },
      { id: 'a2', name: 'Økonomi', horizon: '0-3' },
    ],
    risks: [
      risk({ id: 'r1', ownerId: 'o1', themeId: 't1', areaId: 'a1' }),
      risk({ id: 'r2', ownerId: 'o1', themeId: 't2', areaId: 'a1' }),
      risk({ id: 'r3', ownerId: 'o2', themeId: 't2', areaId: 'a1' }),
    ],
  }
}

describe('normalizeName', () => {
  it('ser bort fra store/små bokstaver og overflødige mellomrom', () => {
    expect(normalizeName('  Kari   NORDMANN ')).toBe('kari nordmann')
    expect(normalizeName('ØKONOMI')).toBe('økonomi')
  })
})

describe('isNameTaken', () => {
  it('finner duplikat med annen skrivemåte', () => {
    expect(isNameTaken(owners, 'kari nordmann')).toBe(true)
    expect(isNameTaken(owners, ' KARI  Nordmann ')).toBe(true)
    expect(isNameTaken(owners, 'ola åsen')).toBe(true)
  })

  it('godtar et navn som ikke er i bruk', () => {
    expect(isNameTaken(owners, 'Kari Nordman')).toBe(false)
    expect(isNameTaken([], 'Kari Nordmann')).toBe(false)
  })

  it('lar et element beholde sitt eget navn ved redigering', () => {
    expect(isNameTaken(owners, 'Kari Nordmann', 'o1')).toBe(false)
    expect(isNameTaken(owners, 'KARI NORDMANN', 'o1')).toBe(false)
  })

  it('hindrer at et element får navnet til et annet', () => {
    expect(isNameTaken(owners, 'Kari Nordmann', 'o2')).toBe(true)
  })
})

describe('risksReferencing', () => {
  const { risks } = validData()

  it('lister risikoene som blokkerer sletting', () => {
    expect(risksReferencing(risks, 'owner', 'o1').map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(risksReferencing(risks, 'theme', 't2').map((r) => r.id)).toEqual(['r2', 'r3'])
    expect(risksReferencing(risks, 'area', 'a1').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })

  it('gir tom liste for element som ikke er i bruk', () => {
    expect(risksReferencing(risks, 'area', 'a2')).toEqual([])
    expect(risksReferencing([], 'owner', 'o1')).toEqual([])
  })

  it('blander ikke ID-er på tvers av registre', () => {
    const mixed = [risk({ id: 'r1', ownerId: 'x', themeId: 'y', areaId: 'z' })]
    expect(risksReferencing(mixed, 'theme', 'x')).toEqual([])
    expect(risksReferencing(mixed, 'owner', 'x')).toHaveLength(1)
  })
})

describe('countRisksBy', () => {
  it('teller risikoer per element', () => {
    const { risks } = validData()
    expect(Object.fromEntries(countRisksBy(risks, 'owner'))).toEqual({ o1: 2, o2: 1 })
    expect(Object.fromEntries(countRisksBy(risks, 'theme'))).toEqual({ t1: 1, t2: 2 })
    expect(Object.fromEntries(countRisksBy(risks, 'area'))).toEqual({ a1: 3 })
  })

  it('har ingen oppføring for element uten risikoer', () => {
    expect(countRisksBy(validData().risks, 'area').get('a2')).toBeUndefined()
  })
})

describe('findIntegrityErrors', () => {
  it('godtar gyldige og tomme data', () => {
    expect(findIntegrityErrors(validData())).toEqual([])
    expect(
      findIntegrityErrors({ schemaVersion: 3, owners: [], themes: [], areas: [], risks: [] }),
    ).toEqual([])
  })

  it.each([
    ['ownerId', 'risikoeier'],
    ['themeId', 'tema'],
    ['areaId', 'område'],
  ] as const)('finner ødelagt referanse i %s', (field, label) => {
    const data = validData()
    data.risks = [risk({ id: 'r1', title: 'Brann', [field]: 'finnes-ikke' })]
    expect(findIntegrityErrors(data)).toEqual([
      `Risikoen «Brann» viser til ${label} som ikke finnes.`,
    ])
  })

  it('finner like ID-er i et register og blant risikoer', () => {
    const data = validData()
    data.owners = [...data.owners, { id: 'o1', name: 'Per Hansen' }]
    data.risks = [...data.risks, risk({ id: 'r1' })]
    expect(findIntegrityErrors(data)).toEqual([
      'Flere risikoeier-oppføringer har intern id «o1».',
      'Flere risikoer har intern id «r1».',
    ])
  })

  it('finner like navn i et register', () => {
    const data = validData()
    data.themes = [...data.themes, { id: 't3', name: ' leverandør' }]
    expect(findIntegrityErrors(data)).toEqual(['Navnet « leverandør» er brukt flere ganger (tema).'])
  })

  it('tillater samme navn i ulike registre', () => {
    const data = validData()
    data.areas = [...data.areas, { id: 'a3', name: 'Sikkerhet', horizon: '0-3' }]
    expect(findIntegrityErrors(data)).toEqual([])
  })

  it('rapporterer alle feil samlet', () => {
    const data = validData()
    data.risks = [risk({ id: 'r1', ownerId: 'x', themeId: 'y', areaId: 'z' })]
    expect(findIntegrityErrors(data)).toHaveLength(3)
  })
})

describe('egne ID-er (spec 004)', () => {
  const risks = [risk({ id: 'r1', code: 'R-007' }), risk({ id: 'r2', code: 'R-008' }), risk({ id: 'r3' })]

  describe('isCodeTaken (K48)', () => {
    it('regner «R-007» og «r-007 » som samme ID', () => {
      expect(isCodeTaken(risks, 'r-007 ')).toBe(true)
      expect(isCodeTaken(risks, ' R-007')).toBe(true)
    })

    it('godtar en ledig ID', () => {
      expect(isCodeTaken(risks, 'R-009')).toBe(false)
    })

    it('lar elementet som redigeres beholde sin egen ID', () => {
      expect(isCodeTaken(risks, 'R-007', 'r1')).toBe(false)
      expect(isCodeTaken(risks, 'R-007', 'r2')).toBe(true)
    })

    it('lar elementer uten ID aldri kollidere', () => {
      expect(isCodeTaken([risk({ id: 'r3' })], '')).toBe(false)
    })

    it('gjelder bare innen én type: eier «7» og risiko «7» er lov', () => {
      const data = validData()
      data.owners = [{ id: 'o1', code: '7', name: 'Kari Nordmann' }, owners[1]!]
      expect(isCodeTaken(data.risks, '7')).toBe(false)
      expect(isCodeTaken(data.owners, '7')).toBe(true)
    })
  })

  describe('findIntegrityErrors med ID-er', () => {
    it('godtar unike ID-er, manglende ID-er og samme ID i ulike typer', () => {
      const data = validData()
      data.owners = [{ id: 'o1', code: '7', name: 'Kari Nordmann' }, owners[1]!]
      data.risks = data.risks.map((item, index) => ({ ...item, code: index === 0 ? '7' : undefined }))
      expect(findIntegrityErrors(data)).toEqual([])
    })

    it('melder like ID-er innen en type, én gang per ID', () => {
      const data = validData()
      data.areas = data.areas.map((area) => ({ ...area, code: 'O-1' }))
      data.risks = [
        risk({ id: 'r1', code: 'R-1' }),
        risk({ id: 'r2', code: 'r-1' }),
        risk({ id: 'r3', code: 'R-1 ' }),
      ]
      expect(findIntegrityErrors(data)).toEqual([
        'ID-en «O-1» er brukt flere ganger (område).',
        'ID-en «r-1» er brukt flere ganger (risiko).',
      ])
    })
  })

  describe('findMissingCodes (K54)', () => {
    it('finner elementer uten ID i hver type', () => {
      const data = validData()
      data.owners = [{ id: 'o1', code: 'E-1', name: 'Kari Nordmann' }, owners[1]!]
      data.risks = [risk({ id: 'r1', code: 'R-1' }), risk({ id: 'r2' })]
      const missing = findMissingCodes(data)
      expect(missing.owners.map((item) => item.id)).toEqual(['o2'])
      expect(missing.themes.map((item) => item.id)).toEqual(['t1', 't2'])
      expect(missing.areas.map((item) => item.id)).toEqual(['a1', 'a2'])
      expect(missing.risks.map((item) => item.id)).toEqual(['r2'])
      expect(countMissingCodes(missing)).toBe(6)
    })

    it('gir null når alle har ID', () => {
      const data = validData()
      data.owners = data.owners.map((item, index) => ({ ...item, code: `E-${index}` }))
      data.themes = data.themes.map((item, index) => ({ ...item, code: `T-${index}` }))
      data.areas = data.areas.map((item, index) => ({ ...item, code: `O-${index}` }))
      data.risks = data.risks.map((item, index) => ({ ...item, code: `R-${index}` }))
      expect(countMissingCodes(findMissingCodes(data))).toBe(0)
    })
  })
})
