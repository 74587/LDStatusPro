import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { URL } from 'node:url'
import {
  COUPON_SELECTION_AUTO,
  COUPON_SELECTION_MANUAL,
  evaluateFinalQuote,
  normalizeCouponSelectionMode,
  resolveCouponSelection,
  resolveCouponSelectionAfterQuoteFailure,
} from '../src/utils/checkoutCoupon'

const orderConfirmSource = readFileSync(new URL('../src/views/OrderConfirm.vue', import.meta.url), 'utf8')

function coupon(claimId, { eligible = true, couponDiscountAmount = 0 } = {}) {
  return { claimId, eligible, couponDiscountAmount }
}

describe('确认订单优惠券选择', () => {
  it('订单确认页直接进入核对内容，不重复展示大标题与说明', () => {
    expect(orderConfirmSource).not.toContain('class="checkout-header"')
    expect(orderConfirmSource).not.toContain('确认物品、数量与优惠后提交兑换。')
    expect(orderConfirmSource).toContain('aria-label="订单确认"')
  })

  it('自动模式沿用报价接口排序选择最优惠的可用券', () => {
    const selection = resolveCouponSelection({
      coupons: [coupon(8, { couponDiscountAmount: 20 }), coupon(3, { couponDiscountAmount: 12 })],
      mode: COUPON_SELECTION_AUTO,
    })

    expect(selection).toEqual({
      selectedClaimId: 8,
      mode: COUPON_SELECTION_AUTO,
      replacedManualSelection: false,
    })
  })

  it('用户明确不用券后，数量变化仍保持手动不用券', () => {
    const selection = resolveCouponSelection({
      coupons: [coupon(8, { couponDiscountAmount: 20 })],
      mode: COUPON_SELECTION_MANUAL,
      selectedClaimId: null,
    })

    expect(selection.selectedClaimId).toBeNull()
    expect(selection.mode).toBe(COUPON_SELECTION_MANUAL)
  })

  it('手动选择的券在新报价中仍可用时继续保留', () => {
    const selection = resolveCouponSelection({
      coupons: [coupon(9, { couponDiscountAmount: 30 }), coupon(4, { couponDiscountAmount: 10 })],
      mode: COUPON_SELECTION_MANUAL,
      selectedClaimId: 4,
    })

    expect(selection).toEqual({
      selectedClaimId: 4,
      mode: COUPON_SELECTION_MANUAL,
      replacedManualSelection: false,
    })
  })

  it('手动券失效后回到自动模式并选用当前最优券', () => {
    const selection = resolveCouponSelection({
      coupons: [coupon(9, { couponDiscountAmount: 30 }), coupon(4, { eligible: false })],
      mode: COUPON_SELECTION_MANUAL,
      selectedClaimId: 4,
    })

    expect(selection).toEqual({
      selectedClaimId: 9,
      mode: COUPON_SELECTION_AUTO,
      replacedManualSelection: true,
    })
  })

  it('报价失败时不提交旧券，并保留用户明确不用券的意图', () => {
    expect(resolveCouponSelectionAfterQuoteFailure({
      mode: COUPON_SELECTION_MANUAL,
      selectedClaimId: 4,
    })).toEqual({ selectedClaimId: null, mode: COUPON_SELECTION_AUTO })

    expect(resolveCouponSelectionAfterQuoteFailure({
      mode: COUPON_SELECTION_MANUAL,
      selectedClaimId: null,
    })).toEqual({ selectedClaimId: null, mode: COUPON_SELECTION_MANUAL })
  })

  it('旧状态兼容：有券按手动处理，无券按自动处理', () => {
    expect(normalizeCouponSelectionMode(undefined, 7)).toBe(COUPON_SELECTION_MANUAL)
    expect(normalizeCouponSelectionMode(undefined, null)).toBe(COUPON_SELECTION_AUTO)
  })

  it('提交前价格发生变化时要求用户重新确认', () => {
    expect(evaluateFinalQuote({
      amountBeforeValidation: 80,
      currentPayableAmount: 86,
      quoteSucceeded: true,
    })).toEqual({ selectedCouponInvalidated: false, confirmationRequired: true })
  })

  it('提交前优惠券被占用或过期时阻止提交旧券', () => {
    expect(evaluateFinalQuote({
      requestedCouponClaimId: 5,
      currentCouponClaimId: null,
      amountBeforeValidation: 70,
      currentPayableAmount: 80,
      quoteSucceeded: true,
    })).toEqual({ selectedCouponInvalidated: true, confirmationRequired: false })

    expect(evaluateFinalQuote({
      requestedCouponClaimId: 5,
      currentCouponClaimId: null,
      amountBeforeValidation: 70,
      currentPayableAmount: 80,
      quoteSucceeded: false,
    })).toEqual({ selectedCouponInvalidated: true, confirmationRequired: false })
  })
})
