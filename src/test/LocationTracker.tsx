import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setCurrentLocation } from './location.ts'

/** Gjør gjeldende adresse tilgjengelig for tester via `currentLocation()`. */
export function LocationTracker() {
  const location = useLocation()
  useEffect(() => {
    setCurrentLocation(location.pathname + location.search)
  }, [location])
  return null
}
