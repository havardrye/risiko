import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useState } from 'react'
import { suggestionsFor, type CodeOption } from '../codeSuggestions.ts'
import { CodeCombobox } from './CodeCombobox.tsx'
import { FormField } from './FormField.tsx'

const OWNERS: CodeOption[] = [
  { id: 'o3', code: 'E-10', name: 'Per Hansen' },
  { id: 'o1', code: 'E-01', name: 'Kari Nordmann' },
  { id: 'o2', code: 'E-02', name: 'Ola Åsen' },
  { id: 'o4', name: 'Anne uten ID' },
]

function Harness({ initial = '', error, onSubmit = () => {} }: { initial?: string; error?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(initial)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FormField label="Risikoeier" required error={error}>
        {(control) => <CodeCombobox control={control} value={value} onChange={setValue} options={OWNERS} />}
      </FormField>
      <button type="submit">Lagre</button>
    </form>
  )
}

function setup(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  return { user, input: screen.getByRole('combobox', { name: 'Risikoeier' }) }
}

const optionTexts = () => screen.queryAllByRole('option').map((option) => option.textContent)

describe('suggestionsFor', () => {
  it('foreslår på ID og navn, sortert naturlig etter ID, uten elementer uten ID', () => {
    expect(suggestionsFor(OWNERS, '').map((o) => o.code)).toEqual(['E-01', 'E-02', 'E-10'])
    expect(suggestionsFor(OWNERS, 'kari').map((o) => o.code)).toEqual(['E-01'])
    expect(suggestionsFor(OWNERS, 'e-1').map((o) => o.code)).toEqual(['E-10'])
    expect(suggestionsFor(OWNERS, 'anne')).toEqual([])
  })

  it('viser høyst 8 forslag', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, code: `X-${i}`, name: `Navn ${i}` }))
    expect(suggestionsFor(many, 'x')).toHaveLength(8)
  })
})

describe('CodeCombobox (spec 005, K57, K58)', () => {
  it('er en combobox med lukket liste til man skriver', () => {
    const { input } = setup()
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('listbox', { hidden: true })).not.toBeVisible()
  })

  it('foreslår «E-01 – Kari Nordmann» når man skriver «kari»', async () => {
    const { user, input } = setup()
    await user.type(input, 'kari')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(optionTexts()).toEqual(['E-01 – Kari Nordmann'])
  })

  it('velger med piltast og Enter, uten å sende skjemaet (akseptkriterium)', async () => {
    const onSubmit = vi.fn()
    const { user, input } = setup({ onSubmit })
    await user.type(input, 'kari')
    await user.keyboard('{ArrowDown}')

    const option = screen.getByRole('option', { name: 'E-01 – Kari Nordmann' })
    expect(option).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', option.id)

    await user.keyboard('{Enter}')
    expect(input).toHaveValue('E-01')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('flytter markeringen med piltastene og går rundt', async () => {
    const { user, input } = setup()
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    expect(optionTexts()).toEqual(['E-01 – Kari Nordmann', 'E-02 – Ola Åsen', 'E-10 – Per Hansen'])
    const selected = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.textContent

    expect(selected()).toBe('E-01 – Kari Nordmann')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(selected()).toBe('E-10 – Per Hansen')
    await user.keyboard('{ArrowDown}')
    expect(selected()).toBe('E-01 – Kari Nordmann')
    await user.keyboard('{ArrowUp}')
    expect(selected()).toBe('E-10 – Per Hansen')
  })

  it('sender skjemaet med Enter når ingen forslag er markert', async () => {
    const onSubmit = vi.fn()
    const { user, input } = setup({ onSubmit })
    await user.type(input, 'E-02{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('lukker listen med Escape uten å endre teksten', async () => {
    const { user, input } = setup()
    await user.type(input, 'e')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveValue('e')
  })

  it('lukker listen med Tab uten å velge', async () => {
    const { user, input } = setup()
    await user.type(input, 'kari')
    await user.keyboard('{ArrowDown}{Tab}')
    expect(input).toHaveValue('kari')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Lagre' })).toHaveFocus()
  })

  it('velger med musen', async () => {
    const { user, input } = setup()
    await user.type(input, 'ola')
    await user.click(screen.getByRole('option', { name: 'E-02 – Ola Åsen' }))
    expect(input).toHaveValue('E-02')
    expect(input).toHaveFocus()
  })

  it('viser navnet ved feltet når ID-en passer, og kobler det til feltet (K57)', async () => {
    const { user, input } = setup()
    await user.type(input, 'e-01 ')
    expect(screen.getByText('Kari Nordmann', { selector: 'p' })).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Kari Nordmann')

    await user.clear(input)
    await user.type(input, 'E-9')
    expect(screen.queryByText('Kari Nordmann', { selector: 'p' })).not.toBeInTheDocument()
    expect(input).not.toHaveAccessibleDescription()
  })

  it('beskriver både navnet og feilen når begge finnes', () => {
    render(<Harness initial="E-01" error="Noe er galt" />)
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Noe er galt Kari Nordmann')
  })

  it('foreslår ikke elementer uten ID', async () => {
    const { user, input } = setup()
    await user.type(input, 'anne')
    expect(optionTexts()).toEqual([])
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('har ingen brudd på tilgjengelighet, lukket og åpen (axe)', async () => {
    const { user, input } = setup()
    const run = async () =>
      (
        await axe.run(document.body, {
          // Komponenten vises alene her, uten sidens landemerker (main), så «region» gjelder ikke.
          rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
          resultTypes: ['violations'],
        })
      ).violations.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
      )
    expect(await run()).toEqual([])
    await user.type(input, 'e')
    await user.keyboard('{ArrowDown}')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3)
    expect(await run()).toEqual([])
  })
})
