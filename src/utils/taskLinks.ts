export function normalizeTaskLinkUrl(value: string): string | null {
  try {
    const parsedUrl = new URL(value.trim())

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null

    return parsedUrl.toString()
  } catch {
    return null
  }
}

export function getTaskLinkHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}
