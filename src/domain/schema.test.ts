import {
  appDataSchema,
  areaSchema,
  emptyAppData,
  ownerInputSchema,
  ownerSchema,
  riskInputSchema,
  riskSchema,
  themeSchema,
} from './schema.ts'

const validRiskInput = {
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
    const noName = ownerInputSchema.safeParse({ name: ' ' })
    expect(noName.success).toBe(false)
    expect(noName.error?.issues[0]?.message).toBe('Navn er påkrevd')
    expect(ownerInputSchema.safeParse({ name: 'Kari', email: 'ikke-epost' }).success).toBe(false)
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
      schemaVersion: 1,
      owners: [{ id: 'o1', name: 'Kari' }],
      themes: [{ id: 't1', name: 'Leverandør' }],
      areas: [{ id: 'a1', name: 'IT' }],
      risks: [validRisk],
    }
    expect(appDataSchema.safeParse(data).success).toBe(true)
  })

  it.each([0, 2, '1', undefined])('avviser schemaVersion %s', (version) => {
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
