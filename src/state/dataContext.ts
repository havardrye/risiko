import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AppData, Area, Owner, Risk, Theme } from '../domain/schema.ts'
import type { DataState, DataStore } from './dataStore.ts'

export const DataStoreContext = createContext<DataStore | null>(null)

/** Gir tilgang til endringer: `createRisk`, `deleteReference` osv. */
export function useDataStore(): DataStore {
  const store = useContext(DataStoreContext)
  if (!store) throw new Error('useDataStore må brukes innenfor DataProvider.')
  return store
}

/** Laster, klar eller feil. Brukes av app-skallet til å velge hva som vises. */
export function useDataState(): DataState {
  const store = useDataStore()
  return useSyncExternalStore(store.subscribe, store.getState)
}

/** Hele datasettet. Kan bare brukes der app-skallet har sikret at data er lastet. */
export function useAppData(): AppData {
  const state = useDataState()
  if (state.status !== 'ready') throw new Error('Data er ikke lastet.')
  return state.data
}

export function useRisks(): Risk[] {
  return useAppData().risks
}

export function useOwners(): Owner[] {
  return useAppData().owners
}

export function useThemes(): Theme[] {
  return useAppData().themes
}

export function useAreas(): Area[] {
  return useAppData().areas
}
