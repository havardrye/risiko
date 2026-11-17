import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.tsx'
import { MemoryRepository } from '../data/memoryRepository.ts'
import type { Repository } from '../data/repository.ts'
import { emptyAppData, type AppData } from '../domain/schema.ts'
import { DataStore } from '../state/dataStore.ts'
import { LocationTracker } from './LocationTracker.tsx'

interface RenderAppOptions {
  /** Startadresse, f.eks. «/matrise». */
  route?: string
  data?: AppData
  /** Overstyrer `data`, f.eks. for å etterligne lagret innhold som ikke kan leses. */
  repository?: Repository
}

/**
 * Tegner hele appen med et minne-repository, slik en bruker møter den.
 * Gjeldende adresse kan leses med `currentLocation()` fra `./location.ts`.
 */
export function renderApp({ route = '/', data = emptyAppData(), repository }: RenderAppOptions = {}) {
  const repo = repository ?? new MemoryRepository(data)
  const store = new DataStore(repo)
  const user = userEvent.setup()
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <LocationTracker />
      <App store={store} />
    </MemoryRouter>,
  )
  return { ...view, user, store, repository: repo }
}
