import { act, render, screen } from '@testing-library/react'
import { MemoryRepository } from '../data/memoryRepository.ts'
import type { AppData } from '../domain/schema.ts'
import { DataProvider } from './DataProvider.tsx'
import { useDataState, useDataStore, useOwners, useRisks } from './dataContext.ts'
import { DataStore } from './dataStore.ts'

const data: AppData = {
  schemaVersion: 6,
  owners: [{ id: 'o1', name: 'Kari Nordmann' }],
  themes: [{ id: 't1', name: 'Leverandør' }],
  areas: [{ id: 'a1', name: 'IT' }],
  risks: [],
}

function Summary() {
  const owners = useOwners()
  const risks = useRisks()
  return (
    <p>
      {owners.length} eiere, {risks.length} risikoer
    </p>
  )
}

function Status() {
  const state = useDataState()
  if (state.status !== 'ready') return <p>{state.status}</p>
  return <Summary />
}

describe('DataProvider', () => {
  it('viser lastetilstand først og data når de er lest', async () => {
    const store = new DataStore(new MemoryRepository(data))
    render(
      <DataProvider store={store}>
        <Status />
      </DataProvider>,
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('1 eiere, 0 risikoer')).toBeInTheDocument()
  })

  it('oppdaterer komponentene når data endres', async () => {
    const store = new DataStore(new MemoryRepository(data))
    render(
      <DataProvider store={store}>
        <Status />
      </DataProvider>,
    )
    await screen.findByText('1 eiere, 0 risikoer')

    await act(async () => {
      await store.createRisk({
        code: 'R-1',
        title: 'Brann',
        type: 'threat',
        ownerId: 'o1',
        themeId: 't1',
        areaId: 'a1',
        likelihood: 1,
        consequence: 5,
      })
    })

    expect(screen.getByText('1 eiere, 1 risikoer')).toBeInTheDocument()
  })

  it('gir komponentene tilgang til datalageret', async () => {
    const store = new DataStore(new MemoryRepository(data))
    function Probe({ expected }: { expected: DataStore }) {
      return <p>{useDataStore() === expected ? 'samme lager' : 'annet lager'}</p>
    }
    render(
      <DataProvider store={store}>
        <Probe expected={store} />
      </DataProvider>,
    )
    await act(async () => {})
    expect(screen.getByText('samme lager')).toBeInTheDocument()
  })

  it('gir tydelig feil når hooks brukes utenfor DataProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Status />)).toThrow('useDataStore må brukes innenfor DataProvider.')
    consoleError.mockRestore()
  })
})
