const STORAGE_KEY = 'ld-store-catalog-slates-v22'
const TTL = 30 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function catalogRotationKey(options = {}) {
  return JSON.stringify([String(options.categoryId || ''), options.sort || 'default', !!options.inStockOnly,
    options.priceMin ?? null, options.priceMax ?? null])
}

function storage() {
  try {
    if (globalThis.navigator?.globalPrivacyControl || ['1', 'yes'].includes(String(globalThis.navigator?.doNotTrack))) return null
    return window.sessionStorage
  } catch { return null }
}

function entries() {
  try {
    const raw = JSON.parse(storage()?.getItem(STORAGE_KEY) || '{}')
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => UUID.test(value?.slateId) && value.expiresAt > Date.now()))
  } catch { return {} }
}

export function beginCatalogRotation(options = {}) {
  const rotationId = globalThis.crypto?.randomUUID?.() || ''
  return { rotationId, previousSlateId: entries()[catalogRotationKey(options)]?.slateId || '' }
}

export function rememberCatalogSlate(options, slateId) {
  if (!UUID.test(slateId || '')) return
  const values = entries()
  values[catalogRotationKey(options)] = { slateId, expiresAt: Date.now() + TTL }
  const bounded = Object.fromEntries(Object.entries(values).sort((a, b) => b[1].expiresAt - a[1].expiresAt).slice(0, 20))
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(bounded)) } catch { /* Optional navigation cache. */ }
}
