import { emptyAppData, type AppData } from '../domain/schema.ts'
import { parseAppData } from './parseAppData.ts'
import { StoredDataError, type Repository } from './repository.ts'

export const STORAGE_KEY = 'risiko.data'

/** Lagrer hele datasettet som JSON under én nøkkel i nettleserens localStorage (spec K19). */
export class LocalStorageRepository implements Repository {
  private readonly listeners = new Set<() => void>()
  private readonly storage: Storage
  private readonly key: string

  constructor(storage: Storage = window.localStorage, key: string = STORAGE_KEY) {
    this.storage = storage
    this.key = key
  }

  async load(): Promise<AppData> {
    const raw = this.storage.getItem(this.key)
    if (raw === null) return emptyAppData()

    const result = parseAppData(raw)
    if (!result.ok) throw new StoredDataError(result.message, raw, result.details)
    return result.data
  }

  async save(data: AppData): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(data))
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    if (this.listeners.size === 0) window.addEventListener('storage', this.onStorage)
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) window.removeEventListener('storage', this.onStorage)
    }
  }

  /** Nettleseren sender `storage` til andre faner når data endres. `key` er null når alt tømmes. */
  private readonly onStorage = (event: StorageEvent): void => {
    if (event.storageArea !== this.storage) return
    if (event.key === null || event.key === this.key) this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
