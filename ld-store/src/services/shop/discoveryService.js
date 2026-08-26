import { api } from '@/utils/api'

const TOKEN_STORAGE_KEY = 'ld-store-discovery-tokens-v2'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const MAX_STORED_TOKENS = 100
const MAX_EVENT_BATCH = 50

let eventQueue = []
let flushTimer = null
let flushing = false

function getSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function discoveryTokenFor(product) {
  return String(product?.discovery_token || product?.discoveryToken || '').trim()
}

function readTokenMap() {
  const sessionStorage = getSessionStorage()
  if (!sessionStorage) return {}
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TOKEN_STORAGE_KEY) || '{}')
    const now = Date.now()
    return Object.fromEntries(Object.entries(parsed || {}).filter(([, entry]) => (
      entry && typeof entry.token === 'string' && Number(entry.expiresAt || 0) > now
    )))
  } catch {
    return {}
  }
}

function writeTokenMap(value) {
  const sessionStorage = getSessionStorage()
  if (!sessionStorage) return
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Attribution is best-effort and must not interfere with navigation.
  }
}

export function rememberDiscoveryToken(product) {
  const productId = Number(product?.id)
  const token = discoveryTokenFor(product)
  if (!Number.isInteger(productId) || productId <= 0 || !token) return ''
  const entries = readTokenMap()
  entries[String(productId)] = { token, expiresAt: Date.now() + TOKEN_TTL_MS }
  const boundedEntries = Object.entries(entries)
    .sort((left, right) => Number(right[1].expiresAt || 0) - Number(left[1].expiresAt || 0))
    .slice(0, MAX_STORED_TOKENS)
  writeTokenMap(Object.fromEntries(boundedEntries))
  return token
}

export function getDiscoveryTokenForProduct(productId) {
  return readTokenMap()[String(productId)]?.token || ''
}

export function clearDiscoveryTokenForProduct(productId) {
  const entries = readTokenMap()
  delete entries[String(productId)]
  writeTokenMap(entries)
}

function eventId() {
  return typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : ''
}

async function flushDiscoveryEvents(retry = true) {
  if (flushing || eventQueue.length === 0) return
  flushing = true
  const events = eventQueue.splice(0, MAX_EVENT_BATCH)
  try {
    const result = await api.post('/api/shop/discovery/events', { events }, { timeout: 5000 })
    if (!result?.success && retry) {
      eventQueue = [...events, ...eventQueue].slice(0, 200)
      window.setTimeout(() => void flushDiscoveryEvents(false), 1000)
    }
  } catch {
    if (retry) eventQueue = [...events, ...eventQueue].slice(0, 200)
  } finally {
    flushing = false
    if (eventQueue.length > 0 && !flushTimer) {
      flushTimer = window.setTimeout(() => {
        flushTimer = null
        void flushDiscoveryEvents()
      }, 500)
    }
  }
}

export function queueDiscoveryEvent(type, options = {}) {
  const id = eventId()
  if (!id) return
  eventQueue.push({
    eventId: id,
    type,
    ...(options.discoveryToken ? { discoveryToken: options.discoveryToken } : {}),
    ...(options.query ? { query: String(options.query).slice(0, 500) } : {}),
    occurredAt: new Date().toISOString()
  })
  if (eventQueue.length >= MAX_EVENT_BATCH) {
    void flushDiscoveryEvents()
  } else if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      void flushDiscoveryEvents()
    }, 500)
  }
}

export function recordProductImpression(product) {
  const token = discoveryTokenFor(product)
  if (token) queueDiscoveryEvent('impression', { discoveryToken: token })
}

export function recordProductClick(product) {
  const token = rememberDiscoveryToken(product)
  if (token) queueDiscoveryEvent('click', { discoveryToken: token })
}

export function recordSearchOutcome({ query, products = [], zeroResult = false, reformulation = false }) {
  const token = discoveryTokenFor(products[0])
  if (reformulation) queueDiscoveryEvent('search_reformulation', { query, discoveryToken: token })
  queueDiscoveryEvent('search_submit', { query, discoveryToken: token })
  if (zeroResult) queueDiscoveryEvent('search_zero_result', { query })
}

export async function fetchSearchSuggestionsRequest(query, limit = 8) {
  const params = new URLSearchParams({ q: String(query || '').trim(), limit: String(limit) })
  return api.get(`/api/shop/search/suggestions?${params.toString()}`)
}

export async function fetchDiscoveryPreferenceRequest() {
  return api.get('/api/shop/discovery/preferences')
}

export async function updateDiscoveryPreferenceRequest(personalizationEnabled) {
  return api.put('/api/shop/discovery/preferences', { personalizationEnabled: !!personalizationEnabled })
}
