// Keeps a payment popup attached to the order that opened it.
// The reference lives in this module, so it survives the checkout page
// navigating to the order detail page. The popup's opener is cleared, and the
// gateway is a different origin, so the detail page cannot read the gateway
// document. It can still see when the popup closes, and when the popup lands
// back on this site's /pay/signal page.

export const PAYMENT_SIGNAL_CHANNEL = 'ldstore-payment'
export const PAYMENT_SIGNAL_STORAGE_KEY = 'ldstore:payment-signal'
export const PAYMENT_SIGNAL_PATH = '/pay/signal'

const RETURN_TTL_MS = 2 * 60 * 1000
const WATCH_INTERVAL_MS = 500
const WATCH_MAX_MS = 30 * 60 * 1000
const DUPLICATE_WINDOW_MS = 4000
const RESULT_VALUES = new Set(['success', 'pending', 'error', 'info'])

let tracked = null
const listeners = new Set()
let recentEvents = []
let bridgeReady = false

export function normalizeOrderNo(value) {
  const text = String(value || '').trim()
  return /^[A-Za-z0-9_-]{1,64}$/.test(text) ? text : ''
}

export function normalizePaymentResult(value) {
  const text = String(value || '').trim()
  return RESULT_VALUES.has(text) ? text : ''
}

export function readPaymentSignalFromLocation(href, origin) {
  try {
    const url = new URL(href, origin || undefined)
    if (origin && url.origin !== origin) return null
    const path = url.pathname.replace(/\/+$/, '') || '/'
    if (path !== PAYMENT_SIGNAL_PATH) return null
    return {
      orderNo: normalizeOrderNo(url.searchParams.get('orderNo')),
      result: normalizePaymentResult(url.searchParams.get('result'))
    }
  } catch {
    return null
  }
}

export function trackPaymentPopup(orderNo, popup) {
  releaseTrackedPopup()
  const normalized = normalizeOrderNo(orderNo)
  if (!normalized || !popup) return () => {}

  tracked = { orderNo: normalized, popup, returnAnnounced: false, stop: null }
  if (popup.closed) {
    publish({ type: 'closed', orderNo: normalized, result: '', at: Date.now() })
    return () => {}
  }

  const startedAt = Date.now()
  const timer = setInterval(() => {
    if (!tracked || tracked.popup !== popup) {
      clearInterval(timer)
      return
    }
    announceReturnFromPopup(popup)
    let closed = false
    try {
      closed = popup.closed === true
    } catch {
      closed = false
    }
    if (closed) {
      clearInterval(timer)
      publish({ type: 'closed', orderNo: normalized, result: '', at: Date.now() })
      if (tracked?.popup === popup) tracked.stop = null
      return
    }
    if (Date.now() - startedAt > WATCH_MAX_MS) {
      clearInterval(timer)
      if (tracked?.popup === popup) tracked.stop = null
    }
  }, WATCH_INTERVAL_MS)
  tracked.stop = () => clearInterval(timer)
  return () => {
    if (tracked?.popup === popup) releaseTrackedPopup()
  }
}

export function hasOpenPaymentPopup(orderNo) {
  if (!tracked || tracked.orderNo !== normalizeOrderNo(orderNo) || !tracked.popup) return false
  try {
    return tracked.popup.closed !== true
  } catch {
    return false
  }
}

export function subscribePaymentPopup(orderNo, listener) {
  ensureBridge()
  const normalized = normalizeOrderNo(orderNo)
  if (!normalized || typeof listener !== 'function') return () => {}

  const stored = readStoredSignal()
  if (stored) publish(stored)

  const entry = { orderNo: normalized, listener }
  for (const event of recentEvents) {
    if (event.delivered || !eventMatches(normalized, event)) continue
    event.delivered = true
    listener(event)
  }
  listeners.add(entry)
  return () => listeners.delete(entry)
}

export function announcePaymentSignal({ orderNo = '', result = '' } = {}) {
  const event = {
    type: 'returned',
    orderNo: normalizeOrderNo(orderNo),
    result: normalizePaymentResult(result),
    at: Date.now()
  }
  try {
    localStorage.setItem(PAYMENT_SIGNAL_STORAGE_KEY, JSON.stringify(event))
  } catch {
    // Storage can be unavailable in a private window. The opener still polls location.
  }
  try {
    const channel = new BroadcastChannel(PAYMENT_SIGNAL_CHANNEL)
    channel.postMessage(event)
    channel.close()
  } catch {
    // BroadcastChannel is a backup for the opener's location poll.
  }
  return event
}

export function resetPaymentReturnState() {
  releaseTrackedPopup()
  listeners.clear()
  recentEvents = []
  try {
    localStorage.removeItem(PAYMENT_SIGNAL_STORAGE_KEY)
  } catch {
    // Ignore storage failures while resetting tests.
  }
}

function announceReturnFromPopup(popup) {
  if (!tracked || tracked.popup !== popup || tracked.returnAnnounced) return
  let signal = null
  try {
    signal = readPaymentSignalFromLocation(popup.location?.href, window.location.origin)
  } catch {
    signal = null
  }
  if (!signal) return
  tracked.returnAnnounced = true
  publish({
    type: 'returned',
    orderNo: signal.orderNo || tracked.orderNo,
    result: signal.result,
    at: Date.now()
  })
}

function publish(event) {
  const now = Date.now()
  recentEvents = recentEvents.filter(item => now - item.at < RETURN_TTL_MS)
  if (isDuplicate(event, now)) return
  const stored = { ...event, delivered: false }
  recentEvents.push(stored)
  for (const entry of listeners) {
    if (!eventMatches(entry.orderNo, stored)) continue
    stored.delivered = true
    entry.listener(stored)
  }
}

function isDuplicate(event, now) {
  return recentEvents.some(item => item.type === event.type
    && item.orderNo === event.orderNo
    && item.result === event.result
    && (item.at === event.at || now - item.at < DUPLICATE_WINDOW_MS))
}

function eventMatches(orderNo, event) {
  if (!orderNo) return false
  if (event.orderNo) return event.orderNo === orderNo
  return tracked?.orderNo === orderNo
}

function ensureBridge() {
  if (bridgeReady || typeof window === 'undefined') return
  bridgeReady = true
  window.addEventListener('storage', (event) => {
    if (event.key !== PAYMENT_SIGNAL_STORAGE_KEY || !event.newValue) return
    const parsed = parseSignal(event.newValue)
    if (parsed) publish(parsed)
  })
  try {
    const channel = new BroadcastChannel(PAYMENT_SIGNAL_CHANNEL)
    channel.onmessage = (event) => {
      const parsed = parseSignal(event.data)
      if (parsed) publish(parsed)
    }
  } catch {
    // The location poll and storage event still cover the return signal.
  }
}

function readStoredSignal() {
  try {
    return parseSignal(localStorage.getItem(PAYMENT_SIGNAL_STORAGE_KEY))
  } catch {
    return null
  }
}

function parseSignal(value) {
  const payload = typeof value === 'string' ? parseJson(value) : value
  if (!payload || typeof payload !== 'object') return null
  const at = Number(payload.at)
  if (!Number.isFinite(at) || Date.now() - at > RETURN_TTL_MS || at - Date.now() > 60_000) return null
  const type = payload.type === 'closed' ? 'closed' : 'returned'
  return {
    type,
    orderNo: normalizeOrderNo(payload.orderNo),
    result: normalizePaymentResult(payload.result),
    at
  }
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function releaseTrackedPopup() {
  tracked?.stop?.()
  tracked = null
}
