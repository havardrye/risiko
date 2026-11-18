// @vitest-environment node
// Integrasjonstester: skriver ekte .xlsx-filer og leser dem igjen. Node, som i loadExcelJs.test.ts.
import type { Workbook } from 'exceljs'
import type { AppData } from '../../domain/schema.ts'
import { loadExcelJs } from './loadExcelJs.ts'
import { parseWorkbook } from './parseWorkbook.ts'
import { readXlsx } from './readXlsx.ts'
import { VALIDATION_LAST_ROW, writeTemplate, writeXlsx, XLSX_MIME_TYPE } from './writeXlsx.ts'

const CREATED = '2026-11-01T08:00:00.000Z'

function sample(): AppData {
  return {
    schemaVersion: 2,
    owners: [
      { id: 'o1', name: 'Kari Nordmann', email: 'kari@example.no' },
      { id: 'o2', name: 'Ola Nordmann' },
    ],
    themes: [{ id: 't1', name: 'Leverandør', description: 'Innkjøp og avtaler' }],
    areas: [
      { id: 'a1', name: 'IT', horizon: '3-5' },
      { id: 'a2', name: 'Økonomi', horizon: '5+', description: 'Regnskap' },
    ],
    risks: [
      {
        id: 'r1',
        title: 'Leverandør går konkurs',
        description: 'Viktig leverandør',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 4,
        consequence: 5,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      {
        id: 'r2',
        title: '=HYPERLINK("http://example.com")',
        type: 'opportunity',
        ownerId: 'o2',
        themeId: 't1',
        areaId: 'a2',
        likelihood: 1,
        consequence: 4,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  }
}

/** Datasettet uten det som lages på nytt ved import (id-er og datoer), med navn i stedet for id-er. */
function comparable(data: AppData) {
  const nameOf = (list: readonly { id: string; name: string }[], id: string) =>
    list.find((item) => item.id === id)?.name
  return {
    owners: data.owners.map(({ id: _id, ...rest }) => rest),
    themes: data.themes.map(({ id: _id, ...rest }) => rest),
    areas: data.areas.map(({ id: _id, ...rest }) => rest),
    risks: data.risks.map(({ id: _id, createdAt: _c, updatedAt: _u, ownerId, themeId, areaId, ...rest }) => ({
      ...rest,
      owner: nameOf(data.owners, ownerId),
      theme: nameOf(data.themes, themeId),
      area: nameOf(data.areas, areaId),
    })),
  }
}

async function load(blob: Blob): Promise<Workbook> {
  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  return workbook
}

async function importBlob(blob: Blob) {
  const read = await readXlsx(await blob.arrayBuffer())
  if (!read.ok) throw new Error(read.message)
  return parseWorkbook(read.rows)
}

describe('writeXlsx (K35)', { timeout: 20_000 }, () => {
  it('lager en Excel-fil', async () => {
    const blob = await writeXlsx(sample())
    expect(blob.type).toBe(XLSX_MIME_TYPE)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('gir de samme dataene når filen importeres igjen (akseptkriterium)', async () => {
    const result = await importBlob(await writeXlsx(sample()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(comparable(result.data)).toEqual(comparable(sample()))
  })

  it('har Veiledning først og så datafanene', async () => {
    const workbook = await load(await writeXlsx(sample()))
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Veiledning',
      'Risikoer',
      'Eiere',
      'Temaer',
      'Områder',
    ])
  })

  it('skriver tekst som begynner med «=» som tekst, ikke formel', async () => {
    const workbook = await load(await writeXlsx(sample()))
    const cell = workbook.getWorksheet('Risikoer')?.getCell('A3')
    expect(cell?.value).toBe('=HYPERLINK("http://example.com")')
    expect(cell?.formula).toBeUndefined()
  })

  it('skriver tall som tall og Score og Nivå til informasjon', async () => {
    const sheet = (await load(await writeXlsx(sample()))).getWorksheet('Risikoer')
    expect(sheet?.getRow(1).values).toEqual([
      undefined,
      'Tittel',
      'Beskrivelse',
      'Type',
      'Eier',
      'Tema',
      'Område',
      'Sannsynlighet',
      'Konsekvens',
      'Score',
      'Nivå',
    ])
    expect(sheet?.getRow(2).values).toEqual([
      undefined,
      'Leverandør går konkurs',
      'Viktig leverandør',
      'Trussel',
      'Kari Nordmann',
      'Leverandør',
      'IT',
      4,
      5,
      20,
      'Høy',
    ])
  })

  it('har ingen merknader i fanene med tabeller, som Excel ikke kan åpne (T34)', async () => {
    const workbook = await load(await writeXlsx(sample()))
    for (const name of ['Risikoer', 'Eiere', 'Temaer', 'Områder']) {
      const notes: unknown[] = []
      workbook.getWorksheet(name)?.eachRow((row) =>
        row.eachCell((cell) => {
          if (cell.note) notes.push(cell.address)
        }),
      )
      expect(notes).toEqual([])
    }
  })

  it('har datafanene som Excel-tabeller med fryst overskriftsrad', async () => {
    const workbook = await load(await writeXlsx(sample()))
    for (const name of ['Risikoer', 'Eiere', 'Temaer', 'Områder']) {
      const sheet = workbook.getWorksheet(name)
      expect(sheet?.getTables()).toHaveLength(1)
      expect(sheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    }
  })

  it('har nedtrekkslister på Type, Sannsynlighet, Konsekvens og «Når?» (K33)', async () => {
    const workbook = await load(await writeXlsx(sample()))
    const risks = workbook.getWorksheet('Risikoer')
    const areas = workbook.getWorksheet('Områder')
    const list = (formula: string) => expect.objectContaining({ type: 'list', formulae: [formula] })

    expect(risks?.getCell('C2').dataValidation).toEqual(list('"Trussel,Mulighet"'))
    expect(risks?.getCell(`G${VALIDATION_LAST_ROW}`).dataValidation).toEqual(list('"1,2,3,4,5"'))
    expect(risks?.getCell('H50').dataValidation).toEqual(list('"1,2,3,4,5"'))
    expect(areas?.getCell('B2').dataValidation).toEqual(list('"0 - 3 år,3 - 5 år,5 år +"'))

    expect(risks?.getCell('A2').dataValidation).toBeUndefined()
    expect(risks?.getCell('D2').dataValidation).toBeUndefined()
    expect(risks?.getCell('C1').dataValidation).toBeUndefined()
  })

  it('har en veiledning med varselet om at importen erstatter alt', async () => {
    const sheet = (await load(await writeXlsx(sample()))).getWorksheet('Veiledning')
    const texts: string[] = []
    sheet?.eachRow((row) => row.eachCell((cell) => texts.push(String(cell.value))))
    expect(texts.some((text) => text.includes('erstattes ALLE data'))).toBe(true)
    expect(texts).toContain('Svært alvorlig')
    expect(texts).toContain('Svært verdifull')
  })
})

describe('writeTemplate (K33)', { timeout: 20_000 }, () => {
  it('gir en tom mal som kan importeres uten feil', async () => {
    const result = await importBlob(await writeTemplate())
    expect(result).toEqual({
      ok: true,
      data: { schemaVersion: 2, owners: [], themes: [], areas: [], risks: [] },
    })
  })

  it('kan fylles ut og importeres uten feil (akseptkriterium)', async () => {
    const workbook = await load(await writeTemplate())
    const fill = (sheetName: string, rows: (string | number)[][]) => {
      const sheet = workbook.getWorksheet(sheetName)
      rows.forEach((values, index) => {
        values.forEach((value, column) => {
          if (sheet) sheet.getRow(index + 2).getCell(column + 1).value = value
        })
      })
    }
    fill('Eiere', [['Kari Nordmann', 'kari@example.no'], ['Ola Nordmann']])
    fill('Temaer', [['Leverandør']])
    fill('Områder', [['IT', '0 - 3 år']])
    fill('Risikoer', [
      ['Leverandør går konkurs', '', 'Trussel', 'Kari Nordmann', 'Leverandør', 'IT', 2, 5],
      ['Ny avtale', 'Bedre vilkår', 'Mulighet', 'Ola Nordmann', 'Leverandør', 'IT', 3, 4],
    ])
    const filled = new Blob([await workbook.xlsx.writeBuffer()])

    const result = await importBlob(filled)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.owners).toHaveLength(2)
      expect(result.data.risks.map((risk) => [risk.title, risk.type, risk.likelihood])).toEqual([
        ['Leverandør går konkurs', 'threat', 2],
        ['Ny avtale', 'opportunity', 3],
      ])
    }
  })
})
