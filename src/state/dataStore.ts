import type { z } from 'zod'
import type { Repository } from '../data/repository.ts'
import {
  isCodeTaken,
  isNameTaken,
  risksReferencing,
  themesReferencing,
  type ReferenceKind,
} from '../domain/rules.ts'
import {
  areaInputSchema,
  ownerInputSchema,
  riskInputSchema,
  themeInputSchema,
  type AppData,
  type Area,
  type AreaInput,
  type Id,
  type Owner,
  type OwnerInput,
  type Risk,
  type RiskInput,
  type Theme,
  type ThemeInput,
} from '../domain/schema.ts'

/**
 * Appens tilstand og alle endringer av data (spec K1, K2, K11–K18).
 * Kjenner ikke til React. Hver endring valideres, kontrolleres mot reglene,
 * lagres via repository og først deretter synlig i tilstanden.
 */

export type DataState =
  | { status: 'loading' }
  | { status: 'ready'; data: AppData }
  | { status: 'error'; error: unknown }

/** Felt i et skjema → feilmelding på norsk. */
export type FieldErrors = Record<string, string>

/** ID-en finnes allerede på et annet element av samme type (spec 004, K50). */
const CODE_TAKEN = 'ID-en er allerede i bruk.'

/** En endring ble avvist. Ingenting er lagret. */
export class DataError extends Error {
  /** Feil knyttet til enkeltfelt, til visning ved feltet. */
  readonly fieldErrors: FieldErrors
  /** Risikoene som hindrer sletting (K13, K16, K18). */
  readonly blockingRisks: readonly Risk[]
  /** Temaene som hindrer sletting av et område (spec 006, K68). */
  readonly blockingThemes: readonly Theme[]

  constructor(
    message: string,
    options: {
      fieldErrors?: FieldErrors
      blockingRisks?: readonly Risk[]
      blockingThemes?: readonly Theme[]
    } = {},
  ) {
    super(message)
    this.name = 'DataError'
    this.fieldErrors = options.fieldErrors ?? {}
    this.blockingRisks = options.blockingRisks ?? []
    this.blockingThemes = options.blockingThemes ?? []
  }
}

export interface ReferenceTypes {
  owner: { item: Owner; input: OwnerInput }
  theme: { item: Theme; input: ThemeInput }
  area: { item: Area; input: AreaInput }
}

type ReferenceList = 'owners' | 'themes' | 'areas'

interface ReferenceConfig {
  list: ReferenceList
  schema: z.ZodType<{ code: string; name: string }>
  /** Bestemt form, til feilmeldinger: «Risikoeieren finnes ikke lenger.» */
  definite: string
  riskField: 'ownerId' | 'themeId' | 'areaId'
}

const REFERENCES: Record<ReferenceKind, ReferenceConfig> = {
  owner: {
    list: 'owners',
    schema: ownerInputSchema,
    definite: 'Risikoeieren',
    riskField: 'ownerId',
  },
  theme: { list: 'themes', schema: themeInputSchema, definite: 'Temaet', riskField: 'themeId' },
  area: { list: 'areas', schema: areaInputSchema, definite: 'Området', riskField: 'areaId' },
}

const REFERENCE_KINDS: readonly ReferenceKind[] = ['owner', 'theme', 'area']

export interface DataStoreOptions {
  now?: () => Date
  newId?: () => Id
}

const LOADING: DataState = { status: 'loading' }

/** Tomme valgfrie felt fra skjemaer regnes som ikke utfylt. */
function dropBlankStrings(input: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => !(typeof value === 'string' && value.trim() === '')),
  )
}

function validate<T>(schema: z.ZodType<T>, input: object): T {
  const result = schema.safeParse(dropBlankStrings(input))
  if (result.success) return result.data

  const fieldErrors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '')
    fieldErrors[field] ??= issue.message
  }
  throw new DataError('Skjemaet har feil.', { fieldErrors })
}

export class DataStore {
  private state: DataState = LOADING
  private readonly listeners = new Set<() => void>()
  private readonly repository: Repository
  private readonly now: () => Date
  private readonly newId: () => Id
  private unsubscribeRepository: (() => void) | undefined
  private saving = false

  constructor(repository: Repository, options: DataStoreOptions = {}) {
    this.repository = repository
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  // --- Livssyklus og abonnement ---

  /** Leser data og følger med på endringer fra andre faner. */
  async start(): Promise<void> {
    this.unsubscribeRepository ??= this.repository.subscribe(() => {
      // Egne lagringer er allerede i tilstanden; bare endringer utenfra leses inn.
      if (!this.saving) void this.reload()
    })
    await this.reload()
  }

  stop(): void {
    this.unsubscribeRepository?.()
    this.unsubscribeRepository = undefined
  }

  async reload(): Promise<void> {
    try {
      this.setState({ status: 'ready', data: await this.repository.load() })
    } catch (error) {
      this.setState({ status: 'error', error })
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getState = (): DataState => this.state

  // --- Risikoer (K1, K2) ---

  async createRisk(input: RiskInput): Promise<Risk> {
    const data = this.requireData()
    const fields = this.validateRisk(data, input)
    const timestamp = this.now().toISOString()
    const risk: Risk = { ...fields, id: this.newId(), createdAt: timestamp, updatedAt: timestamp }
    await this.commit({ ...data, risks: [...data.risks, risk] })
    return risk
  }

  async updateRisk(id: Id, input: RiskInput): Promise<Risk> {
    const data = this.requireData()
    const existing = data.risks.find((risk) => risk.id === id)
    if (!existing) throw new DataError('Risikoen finnes ikke lenger.')

    const fields = this.validateRisk(data, input, id)
    const updated: Risk = {
      ...fields,
      id,
      createdAt: existing.createdAt,
      updatedAt: this.now().toISOString(),
    }
    await this.commit({
      ...data,
      risks: data.risks.map((risk) => (risk.id === id ? updated : risk)),
    })
    return updated
  }

  async deleteRisk(id: Id): Promise<void> {
    const data = this.requireData()
    if (!data.risks.some((risk) => risk.id === id)) return
    await this.commit({ ...data, risks: data.risks.filter((risk) => risk.id !== id) })
  }

  // --- Eiere, temaer og områder (K11–K18) ---

  async createReference<K extends ReferenceKind>(
    kind: K,
    input: ReferenceTypes[K]['input'],
  ): Promise<ReferenceTypes[K]['item']> {
    const data = this.requireData()
    const config = REFERENCES[kind]
    const fields = this.validateReference(data, kind, input)
    const item = { ...fields, id: this.newId() } as ReferenceTypes[K]['item']
    await this.commit({ ...data, [config.list]: [...data[config.list], item] })
    return item
  }

  async updateReference<K extends ReferenceKind>(
    kind: K,
    id: Id,
    input: ReferenceTypes[K]['input'],
  ): Promise<ReferenceTypes[K]['item']> {
    const data = this.requireData()
    const config = REFERENCES[kind]
    if (!data[config.list].some((item) => item.id === id)) {
      throw new DataError(`${config.definite} finnes ikke lenger.`)
    }

    const fields = this.validateReference(data, kind, input, id)
    const updated = { ...fields, id } as ReferenceTypes[K]['item']
    await this.commit({
      ...data,
      [config.list]: data[config.list].map((item) => (item.id === id ? updated : item)),
    })
    return updated
  }

  /** Kaster `DataError` med `blockingRisks` hvis elementet er i bruk. */
  async deleteReference(kind: ReferenceKind, id: Id): Promise<void> {
    const data = this.requireData()
    const config = REFERENCES[kind]
    const item = data[config.list].find((candidate) => candidate.id === id)
    if (!item) return

    const blockingRisks = risksReferencing(data.risks, kind, id)
    // Et område kan også være i bruk av temaer (spec 006, K68).
    const blockingThemes = kind === 'area' ? themesReferencing(data.themes, id) : []
    if (blockingRisks.length > 0 || blockingThemes.length > 0) {
      const parts = [
        blockingRisks.length === 0
          ? null
          : blockingRisks.length === 1
            ? '1 risiko'
            : `${blockingRisks.length} risikoer`,
        blockingThemes.length === 0
          ? null
          : blockingThemes.length === 1
            ? '1 tema'
            : `${blockingThemes.length} temaer`,
      ].filter(Boolean)
      throw new DataError(`«${item.name}» kan ikke slettes fordi ${parts.join(' og ')} bruker den.`, {
        blockingRisks,
        blockingThemes,
      })
    }

    await this.commit({
      ...data,
      [config.list]: data[config.list].filter((candidate) => candidate.id !== id),
    })
  }

  // --- Hele datasettet (import og «start tomt») ---

  /** Erstatter alle data. Kan brukes også når lagret innhold ikke lot seg lese. */
  async replaceAll(data: AppData): Promise<void> {
    await this.commit(data)
  }

  // --- Internt ---

  private requireData(): AppData {
    if (this.state.status !== 'ready') throw new DataError('Data er ikke lastet.')
    return this.state.data
  }

  /** `excludeId` er risikoen som endres, slik at den kan beholde sin egen ID. */
  private validateRisk(data: AppData, input: RiskInput, excludeId?: Id): RiskInput {
    const fields = validate(riskInputSchema, input)

    const fieldErrors: FieldErrors = {}
    if (fields.code !== undefined && isCodeTaken(data.risks, fields.code, excludeId)) {
      fieldErrors.code = CODE_TAKEN
    }
    for (const kind of REFERENCE_KINDS) {
      const config = REFERENCES[kind]
      if (!data[config.list].some((item) => item.id === fields[config.riskField])) {
        fieldErrors[config.riskField] = `${config.definite} finnes ikke lenger.`
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new DataError('Skjemaet har feil.', { fieldErrors })
    }
    return fields
  }

  private validateReference<K extends ReferenceKind>(
    data: AppData,
    kind: K,
    input: ReferenceTypes[K]['input'],
    excludeId?: Id,
  ): ReferenceTypes[K]['input'] {
    const config = REFERENCES[kind]
    const fields = validate(config.schema, input)
    const fieldErrors: FieldErrors = {}
    if (fields.code !== undefined && isCodeTaken(data[config.list], fields.code, excludeId)) {
      fieldErrors.code = CODE_TAKEN
    }
    if (isNameTaken(data[config.list], fields.name, excludeId)) {
      fieldErrors.name = 'Navnet er allerede i bruk.'
    }
    // Temaets område må finnes (spec 006, K63).
    const areaId = (fields as { areaId?: string }).areaId
    if (kind === 'theme' && areaId !== undefined && !data.areas.some((area) => area.id === areaId)) {
      fieldErrors.areaId = 'Området finnes ikke lenger.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new DataError('Skjemaet har feil.', { fieldErrors })
    }
    return fields
  }

  /** Lagrer først. Tilstanden endres bare hvis lagringen lykkes. */
  private async commit(next: AppData): Promise<void> {
    this.saving = true
    try {
      await this.repository.save(next)
    } finally {
      this.saving = false
    }
    this.setState({ status: 'ready', data: next })
  }

  private setState(state: DataState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
}
