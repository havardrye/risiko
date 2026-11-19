import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  countRisksBy,
  REFERENCE_LIST,
  risksReferencing,
  themesReferencing,
  type ReferenceKind,
} from '../../domain/rules.ts'
import { CODE_MAX_LENGTH, type Id, type Risk, type Theme } from '../../domain/schema.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { DataError } from '../../state/dataStore.ts'
import {
  initialReferenceText,
  resolveReferenceText,
  showsMissingCode,
  type ReferenceText,
} from '../codeReference.ts'
import { EDIT_REFERENCE_PARAM, ROUTES } from '../routes.ts'
import { nextSetupStep } from '../setupSteps.ts'
import { useFocusRequest } from '../useFocusRequest.ts'
import { usePageTitle } from '../usePageTitle.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Dialog, DialogActions } from './Dialog.tsx'
import { CodeCombobox } from './CodeCombobox.tsx'
import { FormField } from './FormField.tsx'
import { CodeText } from './CodeText.tsx'
import { useFormErrors } from './useFormErrors.ts'
import styles from './ReferenceRegister.module.css'

/** Et felt i registeret i tillegg til navn. */
export interface ExtraField {
  key: 'email' | 'description'
  label: string
  input: 'email' | 'textarea'
  required?: boolean
}

/**
 * En kobling til et annet register, angitt med ID (spec 006, K63–K66): temaets
 * område. Vises som to kolonner (ID og navn) og som ID-felt med forslag.
 */
export interface LinkField {
  key: 'areaId'
  input: 'reference'
  /** Ledetekst i skjemaet og kolonneoverskrift for navnet, f.eks. «Område». */
  label: string
  /** Kolonneoverskrift for ID-en, f.eks. «Område-ID». */
  codeHeader: string
  /** I feilmeldinger, f.eks. «Ingen område har ID …». */
  noun: string
  /** Registeret koblingen peker til. */
  list: 'areas'
  /** Vises i listen når koblingen mangler, f.eks. «Mangler område». */
  missingText: string
}

export type RegisterField = ExtraField | LinkField

const isLink = (field: RegisterField): field is LinkField => field.input === 'reference'

export interface ReferenceRegisterConfig {
  kind: ReferenceKind
  /** Sidetittel, f.eks. «Risikoeiere». */
  title: string
  /** Kort forklaring av hva registeret brukes til. */
  intro: string
  /** Ubestemt form entall, f.eks. «risikoeier». */
  singular: string
  /** Bestemt form entall, f.eks. «risikoeieren». */
  definite: string
  /** Tekst på opprett-knappen og tittel i dialogen, f.eks. «Ny risikoeier». */
  createLabel: string
  /** Vises når registeret er tomt. */
  emptyText: string
  /** Feltene etter ID og navn, i den rekkefølgen de vises i tabell og skjema. */
  fields: readonly RegisterField[]
}

interface ReferenceItem {
  id: Id
  /** Brukerens ID (spec 004). Mangler på elementer fra før endringen. */
  code?: string | undefined
  name: string
  email?: string | undefined
  description?: string | undefined
  /** Temaets område (spec 006). */
  areaId?: string | undefined
}

/** Teksten som vises i tabellen, eller undefined når feltet er tomt. */
function displayValue(field: ExtraField, item: ReferenceItem): string | undefined {
  const value = item[field.key]
  return value === undefined || value === '' ? undefined : value
}

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; item: ReferenceItem }
  | { type: 'confirmDelete'; item: ReferenceItem }
  | { type: 'blocked'; item: ReferenceItem; risks: readonly Risk[]; themes: readonly Theme[] }

const CLOSED: DialogState = { type: 'closed' }

/** «1 risiko og 2 temaer», «dette temaet» osv. i sperredialogen (K68). */
function usageText(risks: number, themes: number): string {
  if (risks === 0) return themes === 1 ? 'dette temaet' : `disse ${themes} temaene`
  const riskText = risks === 1 ? '1 risiko' : `${risks} risikoer`
  const themeText = themes === 1 ? '1 tema' : `${themes} temaer`
  return `${riskText} og ${themeText}`
}

const ROUTE_FOR_KIND: Record<ReferenceKind, { path: string }> = {
  owner: ROUTES.owners,
  theme: ROUTES.themes,
  area: ROUTES.areas,
}

/**
 * Register over eiere, temaer eller områder (spec K11–K18, K25, og ID fra
 * spec 004). De tre registrene oppfører seg likt og skiller seg bare i
 * tekster og feltene etter navn.
 */
export function ReferenceRegister({ config }: { config: ReferenceRegisterConfig }) {
  usePageTitle(config.title)
  const data = useAppData()
  const store = useDataStore()
  const [dialog, setDialog] = useState<DialogState>(CLOSED)
  const [deleteError, setDeleteError] = useState<string>()

  const items = useMemo(
    () =>
      [...(data[REFERENCE_LIST[config.kind]] as ReferenceItem[])].sort((a, b) =>
        a.name.localeCompare(b.name, 'nb', { sensitivity: 'base', numeric: true }),
      ),
    [data, config.kind],
  )
  const counts = useMemo(() => countRisksBy(data.risks, config.kind), [data.risks, config.kind])
  const nextStep = nextSetupStep(data)

  const close = () => setDialog(CLOSED)
  const [headingRef, focusHeading] = useFocusRequest<HTMLHeadingElement>()

  // En lenke som «#/eiere?rediger=o1» (f.eks. fra varselet om manglende ID)
  // åpner elementet for endring. Samme mønster som «?risiko=» i registeret.
  const [params, setParams] = useSearchParams()
  const editId = params.get(EDIT_REFERENCE_PARAM)
  const [handledEditId, setHandledEditId] = useState<string | null>(null)
  if (editId !== handledEditId) {
    setHandledEditId(editId)
    const item = editId ? items.find((candidate) => candidate.id === editId) : undefined
    if (item) setDialog({ type: 'edit', item })
  }
  useEffect(() => {
    if (!editId) return
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(EDIT_REFERENCE_PARAM)
        return next
      },
      { replace: true },
    )
  }, [editId, setParams])

  function requestDelete(item: ReferenceItem) {
    setDeleteError(undefined)
    const risks = risksReferencing(data.risks, config.kind, item.id)
    // Et område kan også være i bruk av temaer (spec 006, K68).
    const themes = config.kind === 'area' ? themesReferencing(data.themes, item.id) : []
    setDialog(
      risks.length > 0 || themes.length > 0
        ? { type: 'blocked', item, risks, themes }
        : { type: 'confirmDelete', item },
    )
  }

  async function confirmDelete(item: ReferenceItem) {
    try {
      await store.deleteReference(config.kind, item.id)
      close()
      focusHeading()
    } catch (error) {
      // Kan skje hvis en annen fane har tatt elementet i bruk i mellomtiden.
      if (error instanceof DataError && (error.blockingRisks.length > 0 || error.blockingThemes.length > 0)) {
        setDialog({ type: 'blocked', item, risks: error.blockingRisks, themes: error.blockingThemes })
      } else {
        close()
        setDeleteError('Kunne ikke slette. Prøv igjen.')
      }
    }
  }

  return (
    <>
      <div className={styles.header}>
        <h1 ref={headingRef} tabIndex={-1}>
          {config.title}
        </h1>
        <button
          type="button"
          className="button button-primary"
          onClick={() => setDialog({ type: 'create' })}
        >
          {config.createLabel}
        </button>
      </div>
      <p className="muted">{config.intro}</p>

      {/* Leder en ny bruker videre mot første risiko, men ikke til siden man allerede står på. */}
      {nextStep && nextStep.route.path !== ROUTE_FOR_KIND[config.kind].path && (
        <p className={styles.nextStep}>
          <strong>Neste steg:</strong> {nextStep.text}{' '}
          <Link to={nextStep.route.path}>{nextStep.route.label}</Link>.
        </p>
      )}

      {deleteError && <p role="alert">{deleteError}</p>}

      {items.length === 0 ? (
        <p className={styles.empty}>{config.emptyText}</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Navn</th>
                {config.fields.flatMap((field) =>
                  isLink(field)
                    ? [
                        <th key={`${field.key}-code`} scope="col">
                          {field.codeHeader}
                        </th>,
                        <th key={field.key} scope="col">
                          {field.label}
                        </th>,
                      ]
                    : [
                        <th key={field.key} scope="col">
                          {field.label}
                        </th>,
                      ],
                )}
                <th scope="col" className="numeric">
                  Risikoer
                </th>
                <th scope="col">
                  <span className="visually-hidden">Handlinger</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="nowrap">
                    <CodeText code={item.code} />
                  </td>
                  <th scope="row">{item.name}</th>
                  {config.fields.flatMap((field) => {
                    if (!isLink(field)) {
                      return [
                        <td key={field.key}>
                          {displayValue(field, item) ?? <span className="muted">–</span>}
                        </td>,
                      ]
                    }
                    const linked = data[field.list].find((candidate) => candidate.id === item[field.key])
                    const missing = <span className="muted">{field.missingText}</span>
                    return [
                      <td key={`${field.key}-code`} className="nowrap">
                        {linked ? <CodeText code={linked.code} /> : missing}
                      </td>,
                      <td key={field.key}>{linked ? linked.name : missing}</td>,
                    ]
                  })}
                  <td className="numeric">{counts.get(item.id) ?? 0}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="button button-small"
                      aria-label={`Endre ${item.name}`}
                      onClick={() => setDialog({ type: 'edit', item })}
                    >
                      Endre
                    </button>
                    <button
                      type="button"
                      className="button button-small"
                      aria-label={`Slett ${item.name}`}
                      onClick={() => requestDelete(item)}
                    >
                      Slett
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialog.type === 'create' || dialog.type === 'edit'}
        title={dialog.type === 'edit' ? `Endre ${config.singular}` : config.createLabel}
        onClose={close}
      >
        <ReferenceForm
          config={config}
          item={dialog.type === 'edit' ? dialog.item : undefined}
          onDone={close}
        />
      </Dialog>

      <ConfirmDialog
        open={dialog.type === 'confirmDelete'}
        title={`Slette ${config.definite}?`}
        confirmLabel="Slett"
        danger
        onConfirm={() => {
          if (dialog.type === 'confirmDelete') void confirmDelete(dialog.item)
        }}
        onCancel={close}
      >
        {dialog.type === 'confirmDelete' && (
          <p>«{dialog.item.name}» blir slettet. Dette kan ikke angres.</p>
        )}
      </ConfirmDialog>

      <Dialog
        open={dialog.type === 'blocked'}
        title={`Kan ikke slette ${config.definite}`}
        onClose={close}
      >
        {dialog.type === 'blocked' && dialog.themes.length === 0 && (
          <>
            <p>
              «{dialog.item.name}» er i bruk av{' '}
              {dialog.risks.length === 1 ? 'denne risikoen' : `disse ${dialog.risks.length} risikoene`}
              . Endre eller slett {dialog.risks.length === 1 ? 'den' : 'dem'} først.
            </p>
            <ul>
              {dialog.risks.map((risk) => (
                <li key={risk.id}>{risk.title}</li>
              ))}
            </ul>
          </>
        )}
        {/* Områder kan også være i bruk av temaer (spec 006, K68). */}
        {dialog.type === 'blocked' && dialog.themes.length > 0 && (
          <>
            <p>
              «{dialog.item.name}» er i bruk av {usageText(dialog.risks.length, dialog.themes.length)}. Endre eller
              slett {dialog.risks.length + dialog.themes.length === 1 ? 'det' : 'dem'} først.
            </p>
            {dialog.risks.length > 0 && (
              <>
                <h3 className={styles.blockedHeading}>Risikoer</h3>
                <ul>
                  {dialog.risks.map((risk) => (
                    <li key={risk.id}>{risk.title}</li>
                  ))}
                </ul>
              </>
            )}
            <h3 className={styles.blockedHeading}>Temaer</h3>
            <ul>
              {dialog.themes.map((theme) => (
                <li key={theme.id}>{theme.name}</li>
              ))}
            </ul>
          </>
        )}
        {dialog.type === 'blocked' && (
          <>
            <DialogActions>
              <button type="button" className="button button-primary" onClick={close}>
                Lukk
              </button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

interface ReferenceFormProps {
  config: ReferenceRegisterConfig
  /** Elementet som endres. Utelatt ved opprettelse. */
  item: ReferenceItem | undefined
  onDone: () => void
}

function ReferenceForm({ config, item, onDone }: ReferenceFormProps) {
  const data = useAppData()
  const store = useDataStore()
  const formRef = useRef<HTMLFormElement>(null)
  const { errors, showErrors, clearError } = useFormErrors(formRef)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { code: item?.code ?? '', name: item?.name ?? '' }
    for (const field of config.fields) if (!isLink(field)) initial[field.key] = item?.[field.key] ?? ''
    return initial
  })
  const links = config.fields.filter(isLink)
  const [linkTexts, setLinkTexts] = useState<Record<string, ReferenceText>>(() =>
    Object.fromEntries(links.map((field) => [field.key, initialReferenceText(data[field.list], item?.[field.key])])),
  )
  const changeLink = (key: string) => (text: string) => {
    setLinkTexts((current) => ({ ...current, [key]: { text, edited: true } }))
    clearError(key)
  }
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  /** Endringshåndterer for et felt. Fjerner samtidig feilmeldingen ved feltet. */
  const change = (key: string) => (event: { target: { value: string } }) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    clearError(key)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(undefined)
    // Koblinger angitt med ID gjøres om til interne id-er (spec 006, K63, K65).
    const linkErrors: Record<string, string> = {}
    const linkIds: Record<string, string> = {}
    for (const field of links) {
      const result = resolveReferenceText(data[field.list], linkTexts[field.key]!, item?.[field.key], field)
      if ('id' in result) linkIds[field.key] = result.id
      else {
        linkIds[field.key] = ''
        linkErrors[field.key] = result.error
      }
    }
    const input = { ...values, ...linkIds } as never
    try {
      if (item) await store.updateReference(config.kind, item.id, input)
      else await store.createReference(config.kind, input)
      onDone()
    } catch (error) {
      setSaving(false)
      if (error instanceof DataError && Object.keys(error.fieldErrors).length > 0) {
        showErrors({ ...error.fieldErrors, ...linkErrors })
      } else {
        showErrors({})
        setFormError(error instanceof DataError ? error.message : 'Kunne ikke lagre. Prøv igjen.')
      }
    }
  }

  return (
    <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate>
      <FormField label="ID" required error={errors.code}>
        {(control) => (
          <input
            {...control}
            type="text"
            className={styles.codeInput}
            value={values.code}
            maxLength={CODE_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            onChange={change('code')}
          />
        )}
      </FormField>

      <FormField label="Navn" required error={errors.name}>
        {(control) => (
          <input
            {...control}
            type="text"
            value={values.name}
            autoComplete="off"
            onChange={change('name')}
          />
        )}
      </FormField>

      {config.fields.map((field) =>
        isLink(field) ? (
          <FormField key={field.key} label={field.label} required error={errors[field.key]}>
            {(control) => (
              <CodeCombobox
                control={control}
                value={linkTexts[field.key]!.text}
                onChange={changeLink(field.key)}
                options={data[field.list]}
                selectOnFocus={showsMissingCode(linkTexts[field.key]!)}
              />
            )}
          </FormField>
        ) : (
        <FormField
          key={field.key}
          label={field.label}
          required={field.required ?? false}
          error={errors[field.key]}
        >
          {(control) =>
            field.input === 'textarea' ? (
              <textarea
                {...control}
                rows={3}
                value={values[field.key]}
                onChange={change(field.key)}
              />
            ) : (
              <input
                {...control}
                type="email"
                value={values[field.key]}
                autoComplete="off"
                onChange={change(field.key)}
              />
            )
          }
        </FormField>
        ),
      )}

      {formError && <p role="alert">{formError}</p>}

      <DialogActions>
        <button type="button" className="button" onClick={onDone}>
          Avbryt
        </button>
        <button type="submit" className="button button-primary" disabled={saving}>
          Lagre
        </button>
      </DialogActions>
    </form>
  )
}
