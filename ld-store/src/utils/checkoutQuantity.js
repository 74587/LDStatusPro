function toNonNegativeInteger(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

export const CHECKOUT_QUANTITY_PLATFORM_MAXIMUM = 5000

export function resolveCheckoutQuantityMaximum({
  platformMaximum = CHECKOUT_QUANTITY_PLATFORM_MAXIMUM,
  purchaseLimitMaximum = 0,
  purchaseLimitReached = false,
  unlimitedStock = false,
  availableStock = 0,
} = {}) {
  const limits = []
  const normalizedPlatformMaximum = toNonNegativeInteger(platformMaximum)
  if (normalizedPlatformMaximum > 0) limits.push(normalizedPlatformMaximum)

  const normalizedPurchaseLimit = toNonNegativeInteger(purchaseLimitMaximum)
  if (normalizedPurchaseLimit > 0 || purchaseLimitReached) {
    limits.push(normalizedPurchaseLimit)
  }

  const normalizedStock = toNonNegativeInteger(availableStock)
  if (!unlimitedStock || normalizedStock > 0) {
    limits.push(normalizedStock)
  }

  if (!limits.length) return null
  const maximum = Math.min(...limits)
  return maximum > 0 ? maximum : 1
}

export function clampCheckoutQuantity(value, maximum = null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1

  const normalized = Math.max(1, Math.floor(parsed))
  return Number.isInteger(maximum) && maximum > 0
    ? Math.min(normalized, maximum)
    : normalized
}
