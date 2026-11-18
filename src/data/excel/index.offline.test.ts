// @vitest-environment node
import { importExcel } from './index.ts'

// Som når ExcelJS-delen ikke kan hentes, f.eks. uten nett etter en ny versjon av appen.
vi.mock('./loadExcelJs.ts', () => ({
  loadExcelJs: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
}))

describe('importExcel når ExcelJS ikke kan lastes', () => {
  it('gir en forståelig feil i stedet for å kaste', async () => {
    const result = await importExcel(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer)
    expect(result).toEqual({
      ok: false,
      message:
        'Excel-støtten kunne ikke lastes. Sjekk nettforbindelsen, last siden på nytt og prøv igjen.',
      details: [],
    })
  })
})
