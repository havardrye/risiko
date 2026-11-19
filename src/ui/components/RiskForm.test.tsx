import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRepository } from '../../data/memoryRepository.ts'
import type { AppData } from '../../domain/schema.ts'
import { DataProvider } from '../../state/DataProvider.tsx'
import { DataStore } from '../../state/dataStore.ts'
import { RiskForm } from './RiskForm.tsx'

// Endring av risiko får en egen knapp i tabellen i T14. Her testes at
// skjemaet håndterer en eksisterende risiko riktig.

const CREATED = '2026-11-01T08:00:00.000Z'
const NOW = '2026-11-17T20:00:00.000Z'

function seed(): AppData {
  return {
    schemaVersion: 6,
    owners: [
      { id: 'o1', code: 'E-1', name: 'Kari Nordmann' },
      { id: 'o2', code: 'E-2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 't1', code: 'T-1', name: 'Leverandør' }],
    areas: [{ id: 'a1', code: 'O-1', name: 'IT' }],
    risks: [
      {
        id: 'r1',
        code: 'M-1',
        title: 'Ny støtteordning',
        description: 'Ekstern finansiering',
        type: 'opportunity',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 3,
        consequence: 4,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
    ],
  }
}

async function setup(data: AppData = seed()) {
  const repository = new MemoryRepository(data)
  const store = new DataStore(repository, { now: () => new Date(NOW) })
  await store.start()
  const onDone = vi.fn()
  const user = userEvent.setup()
  render(
    <DataProvider store={store}>
      <RiskForm risk={data.risks[0]} onDone={onDone} />
    </DataProvider>,
  )
  return { repository, onDone, user }
}

describe('RiskForm ved endring', () => {
  it('fyller ut feltene med verdiene til risikoen', async () => {
    await setup()
    expect(screen.getByLabelText('ID')).toHaveValue('M-1')
    expect(screen.getByLabelText('Tittel')).toHaveValue('Ny støtteordning')
    expect(screen.getByLabelText('Beskrivelse (valgfritt)')).toHaveValue('Ekstern finansiering')
    expect(screen.getByLabelText('Mulighet')).toBeChecked()
    expect(screen.getByLabelText('Risikoeier')).toHaveValue('E-1')
    expect(screen.getByLabelText('Risikoeier')).toHaveAccessibleDescription('Kari Nordmann')
    expect(screen.getByLabelText('Sannsynlighet')).toHaveDisplayValue('3 – Moderat')
    expect(screen.getByLabelText('Konsekvens')).toHaveDisplayValue('4 – Verdifull')
    // 3 × 4 er nivå 2 i tabellen, som heter Middels for muligheter.
    expect(screen.getByText('Score').parentElement).toHaveTextContent('Score 12')
    expect(screen.getByText('Middels')).toBeInTheDocument()
  })

  it('lagrer endringen, beholder opprettet-dato og oppdaterer endret-dato', async () => {
    const { repository, onDone, user } = await setup()
    await user.clear(screen.getByLabelText('Risikoeier'))
    await user.type(screen.getByLabelText('Risikoeier'), 'E-2')
    await user.clear(screen.getByLabelText('Beskrivelse (valgfritt)'))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    const risks = (await repository.load()).risks
    expect(risks).toHaveLength(1)
    expect(risks[0]).toEqual({
      id: 'r1',
      code: 'M-1',
      title: 'Ny støtteordning',
      type: 'opportunity',
      ownerId: 'o2',
      themeId: 't1',
      areaId: 'a1',
      likelihood: 3,
      consequence: 4,
      createdAt: CREATED,
      updatedAt: NOW,
    })
  })

  it('lagrer ingenting ved Avbryt', async () => {
    const { repository, onDone, user } = await setup()
    await user.type(screen.getByLabelText('Tittel'), ' endret')
    await user.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect((await repository.load()).risks).toEqual(seed().risks)
  })
})

describe('RiskForm og ID (spec 004)', () => {
  /** Som før spec 004: risikoen har ingen ID (beslutning 5). */
  function withoutCode(): AppData {
    const data = seed()
    const { code: _code, ...legacy } = data.risks[0]!
    return { ...data, risks: [legacy] }
  }

  it('har ID som første felt, med plass til høyst 20 tegn', async () => {
    await setup()
    const fields = screen.getAllByRole('textbox')
    expect(fields[0]).toBe(screen.getByLabelText('ID'))
    expect(screen.getByLabelText('ID')).toHaveAttribute('maxLength', '20')
  })

  it('krever ID når en gammel risiko uten ID endres (akseptkriterium)', async () => {
    const { repository, onDone, user } = await setup(withoutCode())
    expect(screen.getByLabelText('ID')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText('ID')).toHaveAccessibleDescription('ID er påkrevd')
    expect(screen.getByLabelText('ID')).toHaveFocus()
    expect((await repository.load()).risks).toEqual(withoutCode().risks)

    await user.type(screen.getByLabelText('ID'), 'M-1')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect((await repository.load()).risks[0]?.code).toBe('M-1')
  })

  it('viser feil ved feltet når ID-en er i bruk (akseptkriterium)', async () => {
    const data = seed()
    data.risks.push({ ...data.risks[0]!, id: 'r2', code: 'R-007', title: 'Annen' })
    const { onDone, user } = await setup(data)
    await user.clear(screen.getByLabelText('ID'))
    await user.type(screen.getByLabelText('ID'), 'r-007 ')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText('ID')).toHaveAccessibleDescription('ID-en er allerede i bruk.')
    expect(screen.getByLabelText('ID')).toHaveFocus()
  })
})

describe('eier, tema og område med ID (spec 005, K57–K59)', () => {
  const owner = () => screen.getByLabelText('Risikoeier')

  it('viser navnet når ID-en passer, og lagrer koblingen (akseptkriterium)', async () => {
    const { repository, onDone, user } = await setup()
    await user.clear(owner())
    await user.type(owner(), 'e-2 ')
    expect(owner()).toHaveAccessibleDescription('Ola Åsen')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect((await repository.load()).risks[0]?.ownerId).toBe('o2')
  })

  it('avviser en ID som ingen har, med feil ved feltet og fokus dit (akseptkriterium)', async () => {
    const { repository, onDone, user } = await setup()
    await user.clear(owner())
    await user.type(owner(), 'E-9')
    await user.clear(screen.getByLabelText('Tema'))
    await user.type(screen.getByLabelText('Tema'), 'T-9')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).not.toHaveBeenCalled()
    expect(owner()).toHaveAccessibleDescription('Ingen risikoeier har ID «E-9».')
    expect(screen.getByLabelText('Tema')).toHaveAccessibleDescription('Ingen tema har ID «T-9».')
    expect(owner()).toHaveFocus()
    expect((await repository.load()).risks).toEqual(seed().risks)
  })

  it('krever at feltet er fylt ut', async () => {
    const { onDone, user } = await setup()
    await user.clear(screen.getByLabelText('Område'))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Område')).toHaveAccessibleDescription('Område er påkrevd')
  })

  it('foreslår på navn og velger med tastaturet uten å lagre (akseptkriterium)', async () => {
    const { onDone, user } = await setup()
    await user.clear(owner())
    await user.type(owner(), 'ola')
    expect(screen.getByRole('option', { name: 'E-2 – Ola Åsen' })).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(owner()).toHaveValue('E-2')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('beholder koblingen til en eier uten ID når feltet ikke endres (akseptkriterium, K59)', async () => {
    const data = seed()
    data.owners = data.owners.map(({ code: _code, ...rest }) => rest)
    const { repository, onDone, user } = await setup(data)
    expect(owner()).toHaveValue('Kari Nordmann (mangler ID)')

    await user.type(screen.getByLabelText('Tittel'), ' (endret)')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    const saved = (await repository.load()).risks[0]
    expect(saved?.ownerId).toBe('o1')
    expect(saved?.title).toBe('Ny støtteordning (endret)')
  })

  it('krever en gyldig ID når feltet for en eier uten ID endres', async () => {
    const data = seed()
    data.owners = data.owners.map(({ code: _code, ...rest }) => rest)
    const { onDone, user } = await setup(data)
    // Den gamle teksten markeres ved fokus og erstattes av det som skrives.
    await user.type(owner(), 'x')
    expect(owner()).toHaveValue('x')
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).not.toHaveBeenCalled()
    expect(owner()).toHaveAccessibleDescription('Ingen risikoeier har ID «x».')
  })

  it('viser eierens nye ID når den er endret (akseptkriterium)', async () => {
    const data = seed()
    data.owners = [{ ...data.owners[0]!, code: 'E-01' }, data.owners[1]!]
    await setup(data)
    expect(owner()).toHaveValue('E-01')
    expect(owner()).toHaveAccessibleDescription('Kari Nordmann')
  })
})
