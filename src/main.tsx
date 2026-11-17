import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { LocalStorageRepository } from './data/localStorageRepository.ts'
import './index.css'
import { DataStore } from './state/dataStore.ts'

const store = new DataStore(new LocalStorageRepository())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App store={store} />
    </HashRouter>
  </StrictMode>,
)
