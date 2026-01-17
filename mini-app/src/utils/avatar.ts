export function normalizeAvatarUrl(src?: string | null) {
  if (!src) return undefined
  const trimmed = src.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`
  }
  return trimmed
}

export function isImageAvatar(src?: string | null) {
  const normalized = normalizeAvatarUrl(src)
  if (!normalized) return false
  return (
    normalized.startsWith('https://') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('data:image/') ||
    normalized.startsWith('blob:')
  )
}
