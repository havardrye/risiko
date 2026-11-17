/** Gjeldende adresse i appen under test. Oppdateres av `LocationTracker`. */
let lastLocation = ''

export function setCurrentLocation(location: string): void {
  lastLocation = location
}

/** Gjeldende adresse i appen, f.eks. «/?eier=o2». */
export function currentLocation(): string {
  return lastLocation
}

/** Søkeparametrene i gjeldende adresse. */
export function currentParams(): URLSearchParams {
  return new URLSearchParams(lastLocation.split('?')[1] ?? '')
}
