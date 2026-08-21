const REDACTED = '[REDACTED]'
const PRIVATE_KEY_PATTERN = /(?:authorization|cookie|set-cookie|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|passwd|signature|payment[_-]?sign|cdk|prompt|form(?:data)?)/i
const ID_SEGMENT_PATTERN = /^(?:\d{6,}|[0-9a-f]{16,}|[0-9a-f]{8}-[0-9a-f-]{27,}|[a-z0-9_-]{24,})$/i
const ABSOLUTE_URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi

function redactPathSegment(segment) {
  let decoded = segment
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    // Keep malformed URL segments unchanged and let the generic redactor handle them.
  }
  return ID_SEGMENT_PATTERN.test(decoded) ? ':id' : segment
}

export function sanitizeUrl(value, baseOrigin = 'https://store.invalid') {
  if (typeof value !== 'string' || !value.trim()) return value

  try {
    const url = new URL(value, baseOrigin)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    url.pathname = url.pathname
      .split('/')
      .map(redactPathSegment)
      .join('/')
    return url.toString()
  } catch {
    return redactText(value)
  }
}

export function redactText(value) {
  if (typeof value !== 'string') return value

  return value
    .replace(ABSOLUTE_URL_PATTERN, (url) => sanitizeUrl(url))
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
    .replace(/([?&](?:token|code|key|secret|signature|password|cdk)=)[^&#\s]+/gi, `$1${REDACTED}`)
    .replace(/\b((?:token|api[_-]?key|secret|password|signature|cdk)\s*[:=]\s*)[^\s,;]+/gi, `$1${REDACTED}`)
}

function sanitizeValue(value, key, seen, depth) {
  if (depth > 10) return REDACTED
  if (PRIVATE_KEY_PATTERN.test(key)) return REDACTED
  if (typeof value === 'string') {
    return /(?:url|href|referrer)$/i.test(key)
      ? sanitizeUrl(value, globalThis.location?.origin)
      : redactText(value)
  }
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return REDACTED

  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      value[index] = sanitizeValue(entry, String(index), seen, depth + 1)
    })
  } else {
    Object.entries(value).forEach(([childKey, childValue]) => {
      value[childKey] = sanitizeValue(childValue, childKey, seen, depth + 1)
    })
  }
  seen.delete(value)
  return value
}

export function sanitizeTelemetryItem(item) {
  if (!item || typeof item !== 'object') return null
  return sanitizeValue(item, '', new WeakSet(), 0)
}

export function sanitizeError(error) {
  const safeError = new Error(redactText(String(error?.message || error || 'Unknown client error')))
  safeError.name = redactText(String(error?.name || 'Error'))
  if (error?.stack) safeError.stack = redactText(String(error.stack))
  return safeError
}
