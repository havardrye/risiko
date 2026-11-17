import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { FieldErrors } from '../../state/dataStore.ts'

/**
 * Feilmeldinger for et skjema. Etter et mislykket forsøk på å lagre flyttes
 * fokus til første felt med feil, slik at feilen leses opp og kan rettes
 * direkte. Feilen ved et felt forsvinner så snart brukeren endrer feltet.
 */
export function useFormErrors(formRef: RefObject<HTMLFormElement | null>) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const focusPending = useRef(false)

  useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors, formRef])

  const showErrors = useCallback((next: FieldErrors) => {
    focusPending.current = true
    setErrors(next)
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors((current) => {
      if (!(field in current)) return current
      const rest = { ...current }
      delete rest[field]
      return rest
    })
  }, [])

  return { errors, showErrors, clearError }
}
