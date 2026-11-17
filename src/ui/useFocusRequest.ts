import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Flytter fokus til et element etter neste oppdatering av siden.
 *
 * Brukes når elementet som hadde fokus forsvinner, f.eks. sletteknappen i en
 * rad som nettopp er slettet. Uten dette havner fokus på <body>, og en
 * tastaturbruker må starte på toppen av siden igjen. Fokus flyttes i en
 * effekt, altså etter at en lukket dialog har gitt fokus tilbake.
 */
export function useFocusRequest<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [requests, setRequests] = useState(0)

  useEffect(() => {
    if (requests > 0) ref.current?.focus()
  }, [requests])

  const requestFocus = useCallback(() => setRequests((count) => count + 1), [])
  return [ref, requestFocus] as const
}
