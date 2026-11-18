// @vitest-environment node
// Integrasjonstester med ekte .xlsx-filer laget med ExcelJS. Node, som i loadExcelJs.test.ts.
import type { Workbook } from 'exceljs'
import { loadExcelJs } from './loadExcelJs.ts'
import { parseWorkbook } from './parseWorkbook.ts'
import { MAX_FILE_BYTES, readXlsx, toCellValue } from './readXlsx.ts'

async function newWorkbook(): Promise<Workbook> {
  const ExcelJS = await loadExcelJs()
  return new ExcelJS.Workbook()
}

async function toBuffer(workbook: Workbook): Promise<ArrayBuffer> {
  const data = await workbook.xlsx.writeBuffer()
  return data instanceof ArrayBuffer ? data : new Uint8Array(data as Uint8Array).slice().buffer
}

async function read(workbook: Workbook) {
  const result = await readXlsx(await toBuffer(workbook))
  if (!result.ok) throw new Error(result.message)
  return result.rows
}

describe('readXlsx (K26, K27)', { timeout: 20_000 }, () => {
  it('leser fanenavn, overskrifter og rader med Excel-radnummer', async () => {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet('Eiere')
    sheet.addRow(['Navn', 'E-post'])
    sheet.addRow(['Kari Nordmann', 'kari@example.no'])
    sheet.addRow([])
    sheet.addRow(['Ola Nordmann'])
    workbook.addWorksheet('Temaer').addRow(['Navn'])

    const rows = await read(workbook)
    expect(Object.keys(rows)).toEqual(['Eiere', 'Temaer'])
    expect(rows.Eiere).toEqual({
      headers: ['Navn', 'E-post'],
      rows: [
        { rowNumber: 2, cells: ['Kari Nordmann', 'kari@example.no'] },
        { rowNumber: 4, cells: ['Ola Nordmann', null] },
      ],
    })
    expect(rows.Temaer).toEqual({ headers: ['Navn'], rows: [] })
  })

  it('leser bare kolonner som har overskrift', async () => {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet('Temaer')
    sheet.addRow(['Navn'])
    sheet.getCell('A2').value = 'Leverandør'
    sheet.getCell('D2').value = 'notat uten overskrift'
    expect((await read(workbook)).Temaer.rows).toEqual([{ rowNumber: 2, cells: ['Leverandør'] }])
  })

  it('leser tall som tall', async () => {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet('Risikoer')
    sheet.addRow(['Sannsynlighet', 'Konsekvens'])
    sheet.addRow([4, '5'])
    expect((await read(workbook)).Risikoer.rows[0].cells).toEqual([4, '5'])
  })

  it('leser rik tekst, lenker og formelresultater', async () => {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet('Eiere')
    sheet.addRow(['Navn', 'E-post', 'Tall'])
    sheet.getCell('A2').value = { richText: [{ text: 'Kari ', font: { bold: true } }, { text: 'Nordmann' }] }
    sheet.getCell('B2').value = { text: 'kari@example.no', hyperlink: 'mailto:kari@example.no' }
    sheet.getCell('C2').value = { formula: '2+1', result: 3 }
    expect((await read(workbook)).Eiere.rows[0].cells).toEqual(['Kari Nordmann', 'kari@example.no', 3])
  })

  it('gjør formelfeil, datoer og sannhetsverdier om til celleproblemer', async () => {
    const workbook = await newWorkbook()
    const sheet = workbook.addWorksheet('Temaer')
    sheet.addRow(['A', 'B', 'C', 'D'])
    sheet.getCell('A2').value = { error: '#REF!' }
    sheet.getCell('B2').value = new Date('2026-11-18T00:00:00Z')
    sheet.getCell('C2').value = true
    sheet.getCell('D2').value = { formula: '1/0', result: { error: '#DIV/0!' } }
    expect((await read(workbook)).Temaer.rows[0].cells).toEqual([
      { problem: 'Cellen har en formelfeil (#REF!).' },
      { problem: 'Cellen inneholder en dato. Skriv verdien som tekst eller tall.' },
      { problem: 'Cellen inneholder en sannhetsverdi (SANN/USANN). Skriv verdien som tekst eller tall.' },
      { problem: 'Cellen har en formelfeil (#DIV/0!).' },
    ])
  })

  it('leser en Excel-tabell som vanlige rader', async () => {
    const workbook = await newWorkbook()
    workbook.addWorksheet('Temaer').addTable({
      name: 'Temaer',
      ref: 'A1',
      headerRow: true,
      columns: [{ name: 'Navn' }, { name: 'Beskrivelse' }],
      rows: [
        ['Leverandør', 'Innkjøp og avtaler'],
        ['Lønn', ''],
      ],
    })
    expect(await read(workbook)).toEqual({
      Temaer: {
        headers: ['Navn', 'Beskrivelse'],
        rows: [
          { rowNumber: 2, cells: ['Leverandør', 'Innkjøp og avtaler'] },
          { rowNumber: 3, cells: ['Lønn', ''] },
        ],
      },
    })
  })

  it('avviser en fil over 5 MB uten å lese den', async () => {
    const result = await readXlsx(new ArrayBuffer(MAX_FILE_BYTES + 1))
    expect(result).toEqual({ ok: false, message: 'Filen er for stor (5 MB). Den kan være på høyst 5 MB.' })
  })

  it('avviser en fil som ikke er en Excel-fil', async () => {
    const result = await readXlsx(new TextEncoder().encode('{"schemaVersion": 2}').buffer)
    expect(result).toEqual({ ok: false, message: 'Filen kunne ikke leses som en Excel-fil (.xlsx).' })
  })

  it('gir et gyldig datasett når en ekte fil tolkes (readXlsx + parseWorkbook)', async () => {
    const workbook = await newWorkbook()
    workbook.addWorksheet('Veiledning').addRow(['Les meg'])
    const risks = workbook.addWorksheet('Risikoer')
    risks.addRow(['ID', 'Tittel', 'Type', 'Eier-ID', 'Tema-ID', 'Område-ID', 'Sannsynlighet', 'Konsekvens'])
    risks.addRow(['R-1', 'Leverandør går konkurs', 'Trussel', 'E-1', 'T-1', 7, 2, 5])
    workbook.addWorksheet('Eiere').addRow(['ID', 'Navn'])
    workbook.getWorksheet('Eiere')?.addRow(['E-1', { text: 'Kari Nordmann', hyperlink: 'mailto:kari@example.no' }])
    workbook.addWorksheet('Temaer').addRows([['ID', 'Navn'], ['T-1', 'Leverandør']])
    workbook.addWorksheet('Områder').addRows([['ID', 'Navn', 'Når?'], [7, 'IT', '0 - 3 år']])

    const result = parseWorkbook(await read(workbook))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.risks).toHaveLength(1)
      expect(result.data.risks[0]).toMatchObject({
        code: 'R-1',
        title: 'Leverandør går konkurs',
        likelihood: 2,
        consequence: 5,
      })
      // En ID som er et tall i Excel, leses som tekst.
      expect(result.data.areas[0]?.code).toBe('7')
    }
  })
})

describe('toCellValue', () => {
  it('gir tom celle for null og undefined', () => {
    expect(toCellValue(null)).toBeNull()
    expect(toCellValue(undefined)).toBeNull()
  })

  it('melder en formel uten lagret resultat', () => {
    expect(toCellValue({ formula: 'A1+1' } as never)).toEqual({
      problem: 'Formelen har ikke noe lagret resultat. Åpne filen i Excel og lagre den på nytt.',
    })
  })
})
