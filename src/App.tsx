import { Route, Routes } from 'react-router-dom'
import { useDataState } from './state/dataContext.ts'
import { DataProvider } from './state/DataProvider.tsx'
import type { DataStore } from './state/dataStore.ts'
import { Layout } from './ui/Layout.tsx'
import { AreasPage } from './ui/pages/AreasPage.tsx'
import { MatrixPage } from './ui/pages/MatrixPage.tsx'
import { NotFoundPage } from './ui/pages/NotFoundPage.tsx'
import { OwnersPage } from './ui/pages/OwnersPage.tsx'
import { RisksPage } from './ui/pages/RisksPage.tsx'
import { ThemesPage } from './ui/pages/ThemesPage.tsx'
import { ROUTES } from './ui/routes.ts'
import { StoredDataErrorPage } from './ui/StoredDataErrorPage.tsx'

interface AppProps {
  store: DataStore
}

/** Appen må ligge inne i en ruter (HashRouter i nettleseren, MemoryRouter i tester). */
function App({ store }: AppProps) {
  return (
    <DataProvider store={store}>
      <AppContent />
    </DataProvider>
  )
}

/** Sidene vises først når data er lest, slik at de alltid har et datasett å jobbe med. */
function AppContent() {
  const state = useDataState()

  if (state.status === 'loading') {
    return (
      <p role="status" className="muted" style={{ padding: '2rem' }}>
        Laster …
      </p>
    )
  }

  if (state.status === 'error') {
    return <StoredDataErrorPage error={state.error} />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.risks.path} element={<RisksPage />} />
        <Route path={ROUTES.matrix.path} element={<MatrixPage />} />
        <Route path={ROUTES.owners.path} element={<OwnersPage />} />
        <Route path={ROUTES.themes.path} element={<ThemesPage />} />
        <Route path={ROUTES.areas.path} element={<AreasPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
