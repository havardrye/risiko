import { emptyAppData, type AppData } from '../domain/schema.ts'
import type { Repository } from './repository.ts'

/** Repository som bare lever i minnet. Brukes i tester. */
export class MemoryRepository implements Repository {
  private data: AppData
  private readonly listeners = new Set<() => void>()

  constructor(initial: AppData = emptyAppData()) {
    this.data = structuredClone(initial)
  }

  async load(): Promise<AppData> {
    return structuredClone(this.data)
  }

  async save(data: AppData): Promise<void> {
    this.data = structuredClone(data)
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Etterligner at en annen fane har endret dataene. */
  changeExternally(data: AppData): void {
    this.data = structuredClone(data)
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
