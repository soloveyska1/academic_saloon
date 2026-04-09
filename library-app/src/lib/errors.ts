export function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  const message = error.message.trim()
  if (!message) return fallback

  const normalized = message.toLowerCase()
  if (
    normalized.includes('load failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('the network connection was lost')
  ) {
    return fallback
  }

  return message
}
