import {
  initialReferenceText,
  MISSING_CODE_SUFFIX,
  resolveReferenceText,
  showsMissingCode,
} from './codeReference.ts'

const AREAS = [
  { id: 'a1', code: 'O-01', name: 'IT' },
  { id: 'a2', name: 'Økonomi' },
]
const LABELS = { label: 'Område', noun: 'område' }

describe('initialReferenceText', () => {
  it('viser ID-en til elementet det er koblet til', () => {
    expect(initialReferenceText(AREAS, 'a1')).toEqual({ text: 'O-01', edited: false })
  })

  it('viser «Navn (mangler ID)» når elementet ikke har ID', () => {
    expect(initialReferenceText(AREAS, 'a2')).toEqual({ text: `Økonomi${MISSING_CODE_SUFFIX}`, edited: false })
    expect(showsMissingCode(initialReferenceText(AREAS, 'a2'))).toBe(true)
  })

  it('er tom uten kobling, eller når elementet ikke finnes', () => {
    expect(initialReferenceText(AREAS, undefined)).toEqual({ text: '', edited: false })
    expect(initialReferenceText(AREAS, 'borte')).toEqual({ text: '', edited: false })
  })
})

describe('resolveReferenceText', () => {
  it('gjør en ID om til intern id, uten hensyn til store bokstaver og mellomrom', () => {
    expect(resolveReferenceText(AREAS, { text: ' o-01 ', edited: true }, undefined, LABELS)).toEqual({ id: 'a1' })
  })

  it('gir «… er påkrevd» for tom tekst', () => {
    expect(resolveReferenceText(AREAS, { text: '  ', edited: true }, undefined, LABELS)).toEqual({
      error: 'Område er påkrevd',
    })
  })

  it('gir «Ingen … har ID» for en ukjent ID', () => {
    expect(resolveReferenceText(AREAS, { text: 'O-9', edited: true }, undefined, LABELS)).toEqual({
      error: 'Ingen område har ID «O-9».',
    })
  })

  it('beholder koblingen til et element uten ID når feltet ikke er endret', () => {
    const value = initialReferenceText(AREAS, 'a2')
    expect(resolveReferenceText(AREAS, value, 'a2', LABELS)).toEqual({ id: 'a2' })
  })

  it('krever en gyldig ID når feltet for et element uten ID er endret', () => {
    expect(resolveReferenceText(AREAS, { text: 'Økonomi', edited: true }, 'a2', LABELS)).toEqual({
      error: 'Ingen område har ID «Økonomi».',
    })
    expect(showsMissingCode({ text: `Økonomi${MISSING_CODE_SUFFIX}`, edited: true })).toBe(false)
  })
})
