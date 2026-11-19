// @vitest-environment node
// importExcel med ekte .xlsx-filer. Node, som de andre ExcelJS-testene.
import { emptyAppData, type AppData } from '../../domain/schema.ts'
import { exportExcel, importExcel, isXlsx, MAX_SHOWN_ERRORS } from './index.ts'

const CREATED = '2026-11-01T08:00:00.000Z'

function sample(): AppData {
  return {
    ...emptyAppData(),
    owners: [{ id: 'o1', code: 'E-1', name: 'Kari Nordmann' }],
    themes: [{ id: 't1', code: 'T-1', name: 'Leverandør'}],
    areas: [{ id: 'a1', code: 'O-1', name: 'IT' }],
    risks: [
      {
        id: 'r1',
        code: 'R-1',
        title: 'Leverandør går konkurs',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 2,
        consequence: 5,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  }
}

async function bytesOf(data: AppData): Promise<ArrayBuffer> {
  return (await exportExcel(data)).arrayBuffer()
}

describe('isXlsx', () => {
  it('kjenner igjen zip-signaturen «PK»', () => {
    expect(isXlsx(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer)).toBe(true)
  })

  it('sier nei til JSON, tom fil og én byte', () => {
    expect(isXlsx(new TextEncoder().encode('{"schemaVersion":2}').buffer)).toBe(false)
    expect(isXlsx(new ArrayBuffer(0))).toBe(false)
    expect(isXlsx(new Uint8Array([0x50]).buffer)).toBe(false)
  })
})

describe('importExcel (K26–K30)', { timeout: 20_000 }, () => {
  it('gir et gyldig datasett for en gyldig fil', async () => {
    const result = await importExcel(await bytesOf(sample()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.risks[0].title).toBe('Leverandør går konkurs')
  })

  it('gir feilene som tekst med fane, rad og kolonne (K28)', async () => {
    const data = sample()
    data.risks[0].ownerId = 'finnes-ikke'
    const result = await importExcel(await bytesOf(data))
    expect(result).toEqual({
      ok: false,
      message: 'Filen har 1 feil. Rett den i Excel og importer på nytt.',
      details: ['Risikoer, rad 2, Eier-ID: Eier-ID er påkrevd'],
    })
  })

  it(`viser de første ${MAX_SHOWN_ERRORS} feilene og oppsummerer resten`, async () => {
    const data = sample()
    data.risks = Array.from({ length: 60 }, (_, index) => ({
      ...sample().risks[0],
      id: `r${index}`,
      code: `R-${index}`,
      ownerId: 'x',
    }))
    const result = await importExcel(await bytesOf(data))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe('Filen har 60 feil. Rett dem i Excel og importer på nytt.')
    expect(result.details).toHaveLength(MAX_SHOWN_ERRORS + 1)
    expect(result.details[0]).toBe('Risikoer, rad 2, Eier-ID: Eier-ID er påkrevd')
    expect(result.details.at(-1)).toBe('… og 10 feil til.')
  })

  it('avviser en zip-fil som ikke er en Excel-fil', async () => {
    const result = await importExcel(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]).buffer)
    expect(result).toEqual({
      ok: false,
      message: 'Filen kunne ikke leses som en Excel-fil (.xlsx).',
      details: [],
    })
  })
})
