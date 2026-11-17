import { useEffect } from 'react'

const APP_NAME = 'Risikostyring'

/** Setter fanetittelen, slik at sidene kan skilles i faner, historikk og skjermlesere. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} – ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
