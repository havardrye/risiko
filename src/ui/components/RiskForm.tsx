import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  consequenceLabel,
  likelihoodLabel,
  RISK_TYPE_LABELS,
  RISK_TYPES,
} from '../../domain/scales.ts'
import {
  CODE_MAX_LENGTH,
  type Rating,
  type Risk,
  type RiskInput,
  type RiskType,
} from '../../domain/schema.ts'
import { level, RATINGS, score } from '../../domain/scoring.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { DataError } from '../../state/dataStore.ts'
import {
  initialReferenceText,
  resolveReferenceText,
  showsMissingCode,
  type ReferenceText,
} from '../codeReference.ts'
import { CodeCombobox } from './CodeCombobox.tsx'
import { DialogActions } from './Dialog.tsx'
import { FormField } from './FormField.tsx'
import { useFormErrors } from './useFormErrors.ts'
import { LevelBadge } from './LevelBadge.tsx'
import styles from './RiskForm.module.css'

interface RiskFormProps {
  /** Risikoen som endres. Utelatt ved opprettelse. */
  risk?: Risk | undefined
  onDone: () => void
}

function toRating(value: string): Rating | undefined {
  const number = Number(value)
  return (RATINGS as readonly number[]).includes(number) ? (number as Rating) : undefined
}

/** Koblingene til eier, tema og område, angitt med ID (spec 005, K57–K59). */
type ReferenceField = 'ownerId' | 'themeId' | 'areaId'

const REFERENCE_FIELDS: Record<ReferenceField, { label: string; noun: string; list: 'owners' | 'themes' | 'areas' }> = {
  ownerId: { label: 'Risikoeier', noun: 'risikoeier', list: 'owners' },
  themeId: { label: 'Tema', noun: 'tema', list: 'themes' },
  areaId: { label: 'Område', noun: 'område', list: 'areas' },
}

const FIELD_ORDER: readonly ReferenceField[] = ['ownerId', 'themeId', 'areaId']

/**
 * Skjema for å opprette eller endre en risiko (spec K1–K3). Score og nivå
 * vises fortløpende, og konsekvenstekstene følger valgt type.
 */
export function RiskForm({ risk, onDone }: RiskFormProps) {
  const data = useAppData()
  const store = useDataStore()
  const formRef = useRef<HTMLFormElement>(null)

  const { errors, showErrors, clearError } = useFormErrors(formRef)
  const [values, setValues] = useState({
    code: risk?.code ?? '',
    title: risk?.title ?? '',
    description: risk?.description ?? '',
    likelihood: risk ? String(risk.likelihood) : '',
    consequence: risk ? String(risk.consequence) : '',
  })
  const [references, setReferences] = useState<Record<ReferenceField, ReferenceText>>(() => ({
    ownerId: initialReferenceText(data.owners, risk?.ownerId),
    themeId: initialReferenceText(data.themes, risk?.themeId),
    areaId: initialReferenceText(data.areas, risk?.areaId),
  }))
  const [type, setType] = useState<RiskType>(risk?.type ?? 'threat')
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const options = useMemo(
    () => ({ ownerId: data.owners, themeId: data.themes, areaId: data.areas }),
    [data.owners, data.themes, data.areas],
  )

  const changeReference = (field: ReferenceField) => (text: string) => {
    setReferences((current) => ({ ...current, [field]: { text, edited: true } }))
    clearError(field)
  }

  const likelihoodValue = toRating(values.likelihood)
  const consequenceValue = toRating(values.consequence)

  /** Endringshåndterer for et felt. Fjerner samtidig feilmeldingen ved feltet. */
  const change =
    (field: keyof typeof values) =>
    (event: { target: { value: string } }) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
      clearError(field)
    }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(undefined)
    // ID-ene gjøres om til interne id-er. Feil her vises sammen med eventuelle
    // andre feil fra lagringen, som avviser tomme koblinger uten å lagre.
    const referenceErrors: Record<string, string> = {}
    const ids = {} as Record<ReferenceField, string>
    for (const field of FIELD_ORDER) {
      const result = resolveReferenceText(
        data[REFERENCE_FIELDS[field].list],
        references[field],
        risk?.[field],
        REFERENCE_FIELDS[field],
      )
      if ('id' in result) ids[field] = result.id
      else {
        ids[field] = ''
        referenceErrors[field] = result.error
      }
    }
    const input = {
      ...values,
      ...ids,
      type,
      likelihood: likelihoodValue,
      consequence: consequenceValue,
    } as RiskInput
    try {
      if (risk) await store.updateRisk(risk.id, input)
      else await store.createRisk(input)
      onDone()
    } catch (error) {
      setSaving(false)
      if (error instanceof DataError && Object.keys(error.fieldErrors).length > 0) {
        showErrors({ ...error.fieldErrors, ...referenceErrors })
      } else {
        showErrors({})
        setFormError(error instanceof DataError ? error.message : 'Kunne ikke lagre. Prøv igjen.')
      }
    }
  }

  return (
    <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate>
      <div className={styles.titleRow}>
        <FormField label="ID" required error={errors.code}>
          {(control) => (
            <input
              {...control}
              type="text"
              value={values.code}
              maxLength={CODE_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
              onChange={change('code')}
            />
          )}
        </FormField>

        <FormField label="Tittel" required error={errors.title}>
          {(control) => (
            <input
              {...control}
              type="text"
              value={values.title}
              autoComplete="off"
              onChange={change('title')}
            />
          )}
        </FormField>
      </div>

      <FormField label="Beskrivelse" error={errors.description}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={values.description}
            onChange={change('description')}
          />
        )}
      </FormField>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Type</legend>
        <div className={styles.radios}>
          {RISK_TYPES.map((value) => (
            <label key={value} className={styles.radio}>
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              {RISK_TYPE_LABELS[value]}
            </label>
          ))}
        </div>
        {errors.type && <p className={styles.error}>{errors.type}</p>}
      </fieldset>

      <div className={styles.grid}>
        {FIELD_ORDER.map((field) => (
          <FormField key={field} label={REFERENCE_FIELDS[field].label} required error={errors[field]}>
            {(control) => (
              <CodeCombobox
                control={control}
                value={references[field].text}
                onChange={changeReference(field)}
                options={options[field]}
                selectOnFocus={showsMissingCode(references[field])}
              />
            )}
          </FormField>
        ))}
      </div>

      <div className={styles.grid}>
        <FormField label="Sannsynlighet" required error={errors.likelihood}>
          {(control) => (
            <select
              {...control}
              value={values.likelihood}
              onChange={change('likelihood')}
            >
              <option value="">Velg sannsynlighet</option>
              {RATINGS.map((value) => (
                <option key={value} value={value}>
                  {likelihoodLabel(value)}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Konsekvens" required error={errors.consequence}>
          {(control) => (
            <select
              {...control}
              value={values.consequence}
              onChange={change('consequence')}
            >
              <option value="">Velg konsekvens</option>
              {RATINGS.map((value) => (
                <option key={value} value={value}>
                  {consequenceLabel(type, value)}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      <div className={styles.assessment} aria-live="polite">
        {likelihoodValue && consequenceValue ? (
          <>
            <span>
              Score <strong>{score(likelihoodValue, consequenceValue)}</strong>
            </span>
            <span className={styles.levelLabel}>
              Nivå <LevelBadge type={type} level={level(likelihoodValue, consequenceValue)} />
            </span>
          </>
        ) : (
          <span className="muted">Velg sannsynlighet og konsekvens for å se score og nivå.</span>
        )}
      </div>

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
