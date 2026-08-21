export const COUPON_SELECTION_AUTO = 'auto'
export const COUPON_SELECTION_MANUAL = 'manual'

export function normalizeCouponSelectionMode(value, couponClaimId = null) {
  if (value === COUPON_SELECTION_AUTO || value === COUPON_SELECTION_MANUAL) return value
  return couponClaimId === null ? COUPON_SELECTION_AUTO : COUPON_SELECTION_MANUAL
}

export function resolveCouponSelection({ coupons = [], mode = COUPON_SELECTION_AUTO, selectedClaimId = null } = {}) {
  const eligibleCoupons = Array.isArray(coupons) ? coupons.filter(coupon => coupon?.eligible) : []
  const normalizedMode = normalizeCouponSelectionMode(mode, selectedClaimId)

  if (normalizedMode === COUPON_SELECTION_MANUAL && selectedClaimId === null) {
    return { selectedClaimId: null, mode: COUPON_SELECTION_MANUAL, replacedManualSelection: false }
  }

  if (normalizedMode === COUPON_SELECTION_MANUAL) {
    const selectedCoupon = eligibleCoupons.find(coupon => coupon.claimId === selectedClaimId)
    if (selectedCoupon) {
      return { selectedClaimId, mode: COUPON_SELECTION_MANUAL, replacedManualSelection: false }
    }
  }

  return {
    selectedClaimId: eligibleCoupons[0]?.claimId ?? null,
    mode: COUPON_SELECTION_AUTO,
    replacedManualSelection: normalizedMode === COUPON_SELECTION_MANUAL && selectedClaimId !== null,
  }
}

export function resolveCouponSelectionAfterQuoteFailure({ mode, selectedClaimId = null } = {}) {
  const normalizedMode = normalizeCouponSelectionMode(mode, selectedClaimId)
  const keepManualOptOut = normalizedMode === COUPON_SELECTION_MANUAL && selectedClaimId === null
  return {
    selectedClaimId: null,
    mode: keepManualOptOut ? COUPON_SELECTION_MANUAL : COUPON_SELECTION_AUTO,
  }
}

export function evaluateFinalQuote({
  requestedCouponClaimId = null,
  currentCouponClaimId = null,
  amountBeforeValidation = 0,
  currentPayableAmount = 0,
  quoteSucceeded = false,
} = {}) {
  const selectedCouponInvalidated = requestedCouponClaimId !== null && (
    !quoteSucceeded || currentCouponClaimId !== requestedCouponClaimId
  )
  const selectionChanged = currentCouponClaimId !== requestedCouponClaimId
  const amountChanged = Math.abs(Number(currentPayableAmount) - Number(amountBeforeValidation)) > 0.0001

  return {
    selectedCouponInvalidated,
    confirmationRequired: !selectedCouponInvalidated && quoteSucceeded && (selectionChanged || amountChanged),
  }
}
