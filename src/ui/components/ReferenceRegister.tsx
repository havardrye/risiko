import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  countRisksBy,
  REFERENCE_LIST,
  risksReferencing,
  type ReferenceKind,
} from '../../domain/rules.ts'
import type { Id, Risk } from '../../domain/schema.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { DataError } from '../../state/dataStore.ts'
import { ROUTES } from '../routes.ts'
import { nextSetupStep } from '../setupSteps.ts'
import { useFocusRequest } from '../useFocusRequest.ts'
import { usePageTitle } from '../usePageTitle.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Dialog, DialogActions } from './Dialog.tsx'
import { FormField } from './FormField.tsx'
import { useFormErrors } from './useFormErrors.ts'
import styles from './ReferenceRegister.module.css'

/** Et felt i registeret i tillegg til navn. */
export interface ExtraField {
  key: 'email' | 'description' | 'horizon'
  label: string
  input: 'email' | 'textarea' | 'select'
  required?: boolean
  /** Valgene i nedtrekksmenyen, i rekkefølge. Bare for `input: 'select'`. */
  options?: readonly { value: string; label: string }[]
  /** Første valg i nedtrekksmenyen, f.eks. «Velg når». Bare for `input: 'select'`. */
  placeholder?: string
}

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
  /** Feltene etter navn, i den rekkefølgen de vises i tabell og skjema. */
  fields: readonly ExtraField[]
}

interface ReferenceItem {
  id: Id
  name: string
  email?: string | undefined
  description?: string | undefined
  horizon?: string | undefined
}

/** Teksten som vises i tabellen. For nedtrekksmenyer er det valgets tekst, ikke verdien. */
function displayValue(field: ExtraField, item: ReferenceItem): string | undefined {
  const value = item[field.key]
  if (value === undefined || value === '') return undefined
  return field.options?.find((option) => option.value === value)?.label ?? value
}

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; item: ReferenceItem }
  | { type: 'confirmDelete'; item: ReferenceItem }
  | { type: 'blocked'; item: ReferenceItem; risks: readonly Risk[] }

const CLOSED: DialogState = { type: 'closed' }

const ROUTE_FOR_KIND: Record<ReferenceKind, { path: string }> = {
  owner: ROUTES.owners,
  theme: ROUTES.themes,
  area: ROUTES.areas,
}

/**
 * Register over eiere, temaer eller områder (spec K11–K18, K25). De tre
 * registrene oppfører seg likt og skiller seg bare i tekster og feltene etter navn.
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

  function requestDelete(item: ReferenceItem) {
    setDeleteError(undefined)
    const risks = risksReferencing(data.risks, config.kind, item.id)
    setDialog(
      risks.length > 0 ? { type: 'blocked', item, risks } : { type: 'confirmDelete', item },
    )
  }

  async function confirmDelete(item: ReferenceItem) {
    try {
      await store.deleteReference(config.kind, item.id)
      close()
      focusHeading()
    } catch (error) {
      // Kan skje hvis en annen fane har tatt elementet i bruk i mellomtiden.
      if (error instanceof DataError && error.blockingRisks.length > 0) {
        setDialog({ type: 'blocked', item, risks: error.blockingRisks })
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
                <th scope="col">Navn</th>
                {config.fields.map((field) => (
                  <th key={field.key} scope="col">
                    {field.label}
                  </th>
                ))}
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
                  <th scope="row">{item.name}</th>
                  {config.fields.map((field) => (
                    // Korte faste verdier, som «0 - 3 år», skal ikke brytes over to linjer.
                    <td key={field.key} className={field.input === 'select' ? 'nowrap' : undefined}>
                      {displayValue(field, item) ?? <span className="muted">–</span>}
                    </td>
                  ))}
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
        {dialog.type === 'blocked' && (
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
  const store = useDataStore()
  const formRef = useRef<HTMLFormElement>(null)
  const { errors, showErrors, clearError } = useFormErrors(formRef)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { name: item?.name ?? '' }
    for (const field of config.fields) initial[field.key] = item?.[field.key] ?? ''
    return initial
  })
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
    const input = values as never
    try {
      if (item) await store.updateReference(config.kind, item.id, input)
      else await store.createReference(config.kind, input)
      onDone()
    } catch (error) {
      setSaving(false)
      if (error instanceof DataError && Object.keys(error.fieldErrors).length > 0) {
        showErrors(error.fieldErrors)
      } else {
        showErrors({})
        setFormError(error instanceof DataError ? error.message : 'Kunne ikke lagre. Prøv igjen.')
      }
    }
  }

  return (
    <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate>
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

      {config.fields.map((field) => (
        <FormField
          key={field.key}
          label={field.label}
          required={field.required ?? false}
          error={errors[field.key]}
        >
          {(control) =>
            field.input === 'select' ? (
              <select {...control} value={values[field.key]} onChange={change(field.key)}>
                <option value="">{field.placeholder ?? 'Velg'}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.input === 'textarea' ? (
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
      ))}

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
