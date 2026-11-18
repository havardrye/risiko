/** Sidene i appen, i den rekkefølgen de står i menyen. */
export const ROUTES = {
  risks: { path: '/', label: 'Risikoregister' },
  matrix: { path: '/matrise', label: 'Risikomatrise' },
  owners: { path: '/eiere', label: 'Risikoeiere' },
  themes: { path: '/temaer', label: 'Risikotemaer' },
  areas: { path: '/omrader', label: 'Risikoområder' },
} as const

export const NAV_ITEMS = Object.values(ROUTES)

/** Søkeparameter som får registeret til å åpne en risiko, f.eks. «#/?risiko=r1». */
export const OPEN_RISK_PARAM = 'risiko'

/**
 * Søkeparameter som får et av referanseregistrene til å åpne et element,
 * f.eks. «#/eiere?rediger=o1» (spec 004, K54).
 */
export const EDIT_REFERENCE_PARAM = 'rediger'
