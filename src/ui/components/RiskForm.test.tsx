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
    schemaVersion: 2,
    owners: [
      { id: 'o1', name: 'Kari Nordmann' },
      { id: 'o2', name: 'Ola Åsen' },
    ],
    themes: [{ id: 't1', name: 'Leverandør' }],
    areas: [{ id: 'a1', name: 'IT', horizon: '0-3' }],
    risks: [
      {
        id: 'r1',
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

async function setup() {
  const repository = new MemoryRepository(seed())
  const store = new DataStore(repository, { now: () => new Date(NOW) })
  await store.start()
  const onDone = vi.fn()
  const user = userEvent.setup()
  render(
    <DataProvider store={store}>
      <RiskForm risk={seed().risks[0]} onDone={onDone} />
    </DataProvider>,
  )
  return { repository, onDone, user }
}

describe('RiskForm ved endring', () => {
  it('fyller ut feltene med verdiene til risikoen', async () => {
    await setup()
    expect(screen.getByLabelText('Tittel')).toHaveValue('Ny støtteordning')
    expect(screen.getByLabelText('Beskrivelse (valgfritt)')).toHaveValue('Ekstern finansiering')
    expect(screen.getByLabelText('Mulighet')).toBeChecked()
    expect(screen.getByLabelText('Risikoeier')).toHaveDisplayValue('Kari Nordmann')
    expect(screen.getByLabelText('Sannsynlighet')).toHaveDisplayValue('3 – Moderat')
    expect(screen.getByLabelText('Konsekvens')).toHaveDisplayValue('4 – Verdifull')
    // 3 × 4 er nivå 2 i tabellen, som heter Middels for muligheter.
    expect(screen.getByText('Score').parentElement).toHaveTextContent('Score 12')
    expect(screen.getByText('Middels')).toBeInTheDocument()
  })

  it('lagrer endringen, beholder opprettet-dato og oppdaterer endret-dato', async () => {
    const { repository, onDone, user } = await setup()
    await user.selectOptions(screen.getByLabelText('Risikoeier'), 'Ola Åsen')
    await user.clear(screen.getByLabelText('Beskrivelse (valgfritt)'))
    await user.click(screen.getByRole('button', { name: 'Lagre' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    const risks = (await repository.load()).risks
    expect(risks).toHaveLength(1)
    expect(risks[0]).toEqual({
      id: 'r1',
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
