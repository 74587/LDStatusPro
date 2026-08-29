const PAYMENT_WINDOW_MS = 5 * 60 * 1000

export function parseTopServiceBeijingDateTimeMs(value = '') {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return 0
  const [, year, month, day, hour, minute, second] = match
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 8,
    Number(minute),
    Number(second)
  )
}

export function getTopServicePaymentDeadlineMs(order = {}) {
  const explicit = Number(order.payExpiredAtMs || 0)
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  const legacyDeadline = parseTopServiceBeijingDateTimeMs(order.payExpiredAt)
  if (legacyDeadline > 0) return legacyDeadline

  const createdAtMs = parseTopServiceBeijingDateTimeMs(order.createdAt)
  return createdAtMs > 0 ? createdAtMs + PAYMENT_WINDOW_MS : 0
}

export function getTopServicePaymentRemainingSeconds(order = {}, nowMs = Date.now()) {
  const deadlineMs = getTopServicePaymentDeadlineMs(order)
  if (!deadlineMs || !Number.isFinite(Number(nowMs))) return 0
  return Math.max(0, Math.ceil((deadlineMs - Number(nowMs)) / 1000))
}

export function formatTopServicePaymentCountdown(order = {}, nowMs = Date.now()) {
  const totalSeconds = getTopServicePaymentRemainingSeconds(order, nowMs)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
