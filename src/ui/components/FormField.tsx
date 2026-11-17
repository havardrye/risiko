import { useId, type ReactNode } from 'react'
import styles from './FormField.module.css'

/** Attributtene feltet må få for å være koblet til ledetekst, hjelpetekst og feilmelding. */
export interface FieldControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

interface FormFieldProps {
  label: string
  required?: boolean
  /** Feilmelding som vises ved feltet. */
  error?: string | undefined
  hint?: string
  /** Tegner selve feltet (input, select, textarea) med attributtene det får inn. */
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Ledetekst, felt, hjelpetekst og feilmelding som hører sammen.
 * Feilmeldingen leses opp av skjermlesere fordi feltet peker på den.
 */
export function FormField({ label, required = false, error, hint, children }: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {!required && <span className={styles.optional}> (valgfritt)</span>}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
