/**
 * «R-007 Leverandør går konkurs», eller bare tittelen når ID mangler
 * (spec 004, K49). Brukes i matrisedetaljene og verktøytipset.
 */
export function withCode(code: string | undefined, title: string): string {
  return code ? `${code} ${title}` : title
}
