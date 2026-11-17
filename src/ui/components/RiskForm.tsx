import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  consequenceLabel,
  likelihoodLabel,
  RISK_TYPE_LABELS,
  RISK_TYPES,
} from '../../domain/scales.ts'
import type { Rating, Risk, RiskInput, RiskType } from '../../domain/schema.ts'
import { level, RATINGS, score } from '../../domain/scoring.ts'
import { useAppData, useDataStore } from '../../state/dataContext.ts'
import { DataError } from '../../state/dataStore.ts'
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

function byName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, 'nb', { sensitivity: 'base', numeric: true }),
  )
}

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
    title: risk?.title ?? '',
    description: risk?.description ?? '',
    ownerId: risk?.ownerId ?? '',
    themeId: risk?.themeId ?? '',
    areaId: risk?.areaId ?? '',
    likelihood: risk ? String(risk.likelihood) : '',
    consequence: risk ? String(risk.consequence) : '',
  })
  const [type, setType] = useState<RiskType>(risk?.type ?? 'threat')
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const owners = useMemo(() => byName(data.owners), [data.owners])
  const themes = useMemo(() => byName(data.themes), [data.themes])
  const areas = useMemo(() => byName(data.areas), [data.areas])

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
    const input = {
      ...values,
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
        showErrors(error.fieldErrors)
      } else {
        showErrors({})
        setFormError(error instanceof DataError ? error.message : 'Kunne ikke lagre. Prøv igjen.')
      }
    }
  }

  return (
    <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate>
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
        <FormField label="Risikoeier" required error={errors.ownerId}>
          {(control) => (
            <select {...control} value={values.ownerId} onChange={change('ownerId')}>
              <option value="">Velg risikoeier</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Tema" required error={errors.themeId}>
          {(control) => (
            <select {...control} value={values.themeId} onChange={change('themeId')}>
              <option value="">Velg tema</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Område" required error={errors.areaId}>
          {(control) => (
            <select {...control} value={values.areaId} onChange={change('areaId')}>
              <option value="">Velg område</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
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
