// @vitest-environment node
// ExcelJS er tung å laste; i Node går det raskere enn i jsdom og tar ikke tid fra de andre testene.
import { loadExcelJs } from './loadExcelJs.ts'

describe('loadExcelJs', { timeout: 20_000 }, () => {
  it('kan lage og lese en arbeidsbok', async () => {
    const ExcelJS = await loadExcelJs()

    const written = new ExcelJS.Workbook()
    written.addWorksheet('Eiere').getCell('A1').value = 'Navn'
    const buffer = await written.xlsx.writeBuffer()

    const read = new ExcelJS.Workbook()
    await read.xlsx.load(buffer)
    expect(read.getWorksheet('Eiere')?.getCell('A1').value).toBe('Navn')
  })

  it('laster biblioteket bare én gang', async () => {
    expect(await loadExcelJs()).toBe(await loadExcelJs())
  })
})
