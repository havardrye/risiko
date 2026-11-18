/** Lar brukeren lagre en fil. Data forlater ikke nettleseren på annen måte. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Lar brukeren lagre en tekstfil. */
export function downloadTextFile(fileName: string, text: string, mimeType = 'application/json'): void {
  downloadBlob(fileName, new Blob([text], { type: `${mimeType};charset=utf-8` }))
}
