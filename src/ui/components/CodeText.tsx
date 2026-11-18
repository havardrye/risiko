/**
 * Brukerens ID (spec 004, K49). Elementer fra før endringen kan mangle ID
 * (beslutning 5); de viser «Mangler ID» i dempet tekst. Teksten er vanlig
 * tekst, så skjermlesere leser den opp på samme måte som en ID.
 */
export function CodeText({ code }: { code?: string | undefined }) {
  return code ? <>{code}</> : <span className="muted">Mangler ID</span>
}
