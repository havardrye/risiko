import {
  appDataSchema,
  areaSchema,
  codeSchema,
  emptyAppData,
  ownerInputSchema,
  ownerSchema,
  riskInputSchema,
  riskSchema,
  themeInputSchema,
  themeSchema,
} from './schema.ts'

const validRiskInput = {
  code: 'R-1',
  title: 'Leverandør går konkurs',
  type: 'threat',
  ownerId: 'o1',
  themeId: 't1',
  areaId: 'a1',
  likelihood: 2,
  consequence: 4,
}

const validRisk = {
  ...validRiskInput,
  id: 'r1',
  createdAt: '2026-11-17T20:00:00.000Z',
  updatedAt: '2026-11-17T20:00:00.000Z',
}

describe('riskInputSchema', () => {
  it('godtar en gyldig risiko uten beskrivelse', () => {
    expect(riskInputSchema.safeParse(validRiskInput).success).toBe(true)
  })

  it('fjerner mellomrom rundt tittel', () => {
    const result = riskInputSchema.parse({ ...validRiskInput, title: '  Brann  ' })
    expect(result.title).toBe('Brann')
  })

  it.each(['title', 'type', 'ownerId', 'themeId', 'areaId', 'likelihood', 'consequence'])(
    'avviser risiko uten %s',
    (field) => {
      const input: Record<string, unknown> = { ...validRiskInput }
      delete input[field]
      const result = riskInputSchema.safeParse(input)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.path).toEqual([field])
    },
  )

  it('avviser tittel som bare er mellomrom, med norsk feilmelding', () => {
    const result = riskInputSchema.safeParse({ ...validRiskInput, title: '   ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Tittel er påkrevd')
  })

  it.each(['ownerId', 'themeId', 'areaId'])('avviser tom %s', (field) => {
    expect(riskInputSchema.safeParse({ ...validRiskInput, [field]: '' }).success).toBe(false)
  })

  it.each([0, 6, 2.5, -1, '3'])('avviser sannsynlighet %s', (value) => {
    expect(riskInputSchema.safeParse({ ...validRiskInput, likelihood: value }).success).toBe(false)
  })

  it.each([0, 6, 2.5, -1, '3'])('avviser konsekvens %s', (value) => {
    expect(riskInputSchema.safeParse({ ...validRiskInput, consequence: value }).success).toBe(false)
  })

  it.each([1, 2, 3, 4, 5])('godtar sannsynlighet og konsekvens %s', (value) => {
    const result = riskInputSchema.safeParse({
      ...validRiskInput,
      likelihood: value,
      consequence: value,
    })
    expect(result.success).toBe(true)
  })

  it('godtar begge typer og avviser ukjent type', () => {
    expect(riskInputSchema.safeParse({ ...validRiskInput, type: 'opportunity' }).success).toBe(true)
    expect(riskInputSchema.safeParse({ ...validRiskInput, type: 'annet' }).success).toBe(false)
  })
})

describe('riskSchema', () => {
  it('godtar en lagret risiko', () => {
    expect(riskSchema.safeParse(validRisk).success).toBe(true)
  })

  it.each(['id', 'createdAt', 'updatedAt'])('avviser lagret risiko uten %s', (field) => {
    const input: Record<string, unknown> = { ...validRisk }
    delete input[field]
    expect(riskSchema.safeParse(input).success).toBe(false)
  })

  it('avviser ugyldig dato', () => {
    expect(riskSchema.safeParse({ ...validRisk, updatedAt: 'i går' }).success).toBe(false)
  })
})

describe('referanseregistre', () => {
  it('godtar eier med og uten e-post', () => {
    expect(ownerSchema.safeParse({ id: 'o1', name: 'Kari Nordmann' }).success).toBe(true)
    expect(
      ownerSchema.safeParse({ id: 'o1', name: 'Kari Nordmann', email: 'kari@example.com' }).success,
    ).toBe(true)
  })

  it('avviser eier uten navn og med ugyldig e-post', () => {
    const noName = ownerInputSchema.safeParse({ code: 'E-1', name: ' ' })
    expect(noName.success).toBe(false)
    expect(noName.error?.issues[0]?.message).toBe('Navn er påkrevd')
    expect(ownerInputSchema.safeParse({ code: 'E-1', name: 'Kari', email: 'ikke-epost' }).success).toBe(false)
  })

  it('godtar tema og område med og uten beskrivelse', () => {
    expect(themeSchema.safeParse({ id: 't1', name: 'Leverandør' }).success).toBe(true)
    expect(areaSchema.safeParse({ id: 'a1', name: 'IT', description: 'Drift' }).success).toBe(true)
  })

  it('avviser tema og område uten navn', () => {
    expect(themeSchema.safeParse({ id: 't1', name: '' }).success).toBe(false)
    expect(areaSchema.safeParse({ id: 'a1' }).success).toBe(false)
  })
})

describe('appDataSchema', () => {
  it('godtar et tomt datasett', () => {
    expect(appDataSchema.safeParse(emptyAppData()).success).toBe(true)
  })

  it('godtar et fullt datasett', () => {
    const data = {
      schemaVersion: 6,
      owners: [{ id: 'o1', name: 'Kari' }],
      themes: [{ id: 't1', name: 'Leverandør' }],
      areas: [{ id: 'a1', name: 'IT' }],
      risks: [validRisk],
    }
    expect(appDataSchema.safeParse(data).success).toBe(true)
  })

  it.each([0, 1, 2, 3, 4, 5, 7, '6', undefined])('avviser schemaVersion %s', (version) => {
    expect(appDataSchema.safeParse({ ...emptyAppData(), schemaVersion: version }).success).toBe(false)
  })

  it('avviser datasett som mangler en liste', () => {
    const { risks: _risks, ...withoutRisks } = emptyAppData()
    expect(appDataSchema.safeParse(withoutRisks).success).toBe(false)
  })

  it('avviser datasett med en ugyldig risiko', () => {
    const data = { ...emptyAppData(), risks: [{ ...validRisk, likelihood: 9 }] }
    expect(appDataSchema.safeParse(data).success).toBe(false)
  })
})

describe('ID (code, spec 004)', () => {
  it('godtar fritekst og trimmer mellomrom', () => {
    expect(codeSchema.parse('  R-007 ')).toBe('R-007')
    expect(codeSchema.parse('IT-12')).toBe('IT-12')
    expect(codeSchema.parse('7')).toBe('7')
  })

  it('godtar 20 tegn, men ikke 21 (K48)', () => {
    expect(codeSchema.safeParse('x'.repeat(20)).success).toBe(true)
    const result = codeSchema.safeParse('x'.repeat(21))
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('ID kan være høyst 20 tegn')
  })

  it('avviser tom ID med «ID er påkrevd»', () => {
    expect(codeSchema.safeParse('   ').error?.issues[0]?.message).toBe('ID er påkrevd')
  })

  it('er valgfri i lagrede data, slik at elementer fra før kan mangle ID (beslutning 5)', () => {
    expect(ownerSchema.safeParse({ id: 'o1', name: 'Kari' }).success).toBe(true)
    expect(areaSchema.safeParse({ id: 'a1', name: 'IT' }).success).toBe(true)
    expect(riskSchema.safeParse(validRisk).success).toBe(true)
  })

  it('lagres når den er satt', () => {
    expect(themeSchema.parse({ id: 't1', code: ' T-01 ', name: 'Leverandør' })).toEqual({
      id: 't1',
      code: 'T-01',
      name: 'Leverandør',
    })
    expect(riskSchema.parse({ ...validRisk, code: 'R-007' }).code).toBe('R-007')
  })

  it('kontrolleres også i lagrede data', () => {
    expect(ownerSchema.safeParse({ id: 'o1', code: 'x'.repeat(21), name: 'Kari' }).success).toBe(false)
  })
})

describe('temaer uten område (spec 008)', () => {
  it('godtar et tema uten område', () => {
    expect(themeSchema.safeParse({ id: 't1', name: 'Leverandør' }).success).toBe(true)
    expect(themeInputSchema.safeParse({ code: 'T-1', name: 'Leverandør' }).success).toBe(true)
  })

  it('forkaster område i inndata og i lagrede data', () => {
    expect(themeInputSchema.parse({ code: 'T-1', name: 'Leverandør', areaId: 'a1' })).toEqual({
      code: 'T-1',
      name: 'Leverandør',
    })
    expect(themeSchema.parse({ id: 't1', name: 'Leverandør', areaId: 'a1' })).toEqual({ id: 't1', name: 'Leverandør' })
  })
})
