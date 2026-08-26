const DISCOVERY_SESSION_KEY = 'ld-store-discovery-session-v2'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function privacyOptOutEnabled() {
  if (typeof navigator === 'undefined') return false
  return navigator.globalPrivacyControl === true || ['1', 'yes'].includes(String(navigator.doNotTrack || '').toLowerCase())
}

function getSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function getDiscoverySessionId() {
  if (privacyOptOutEnabled()) return ''
  const sessionStorage = getSessionStorage()
  if (!sessionStorage) return ''
  try {
    const existing = String(sessionStorage.getItem(DISCOVERY_SESSION_KEY) || '')
    if (UUID_PATTERN.test(existing)) return existing.toLowerCase()
    const next = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : ''
    if (!UUID_PATTERN.test(next)) return ''
    sessionStorage.setItem(DISCOVERY_SESSION_KEY, next)
    return next
  } catch {
    return ''
  }
}

export function getDiscoveryRequestHeaders(url = '') {
  if (!String(url).startsWith('/api/shop')) return {}
  if (privacyOptOutEnabled()) return { 'X-Discovery-Privacy': 'opt-out' }
  const sessionId = getDiscoverySessionId()
  return sessionId ? { 'X-Discovery-Session': sessionId } : {}
}
