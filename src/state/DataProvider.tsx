import { useEffect, type ReactNode } from 'react'
import { DataStoreContext } from './dataContext.ts'
import type { DataStore } from './dataStore.ts'

interface DataProviderProps {
  store: DataStore
  children: ReactNode
}

/** Gjør datalageret tilgjengelig for komponentene og starter innlesingen. */
export function DataProvider({ store, children }: DataProviderProps) {
  useEffect(() => {
    void store.start()
    return () => store.stop()
  }, [store])

  return <DataStoreContext value={store}>{children}</DataStoreContext>
}
