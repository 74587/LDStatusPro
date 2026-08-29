import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  formatTopServicePaymentCountdown,
  getTopServicePaymentDeadlineMs,
  getTopServicePaymentRemainingSeconds
} from '../src/utils/topServiceOrder.js'

describe('top-service pending payment window', () => {
  const deadlineMs = Date.UTC(2026, 7, 30, 4, 5, 0)
  const order = {
    status: 'pending',
    payExpiredAt: '2026-08-30 12:05:00',
    payExpiredAtMs: deadlineMs
  }

  it('uses the server deadline and expires exactly at the boundary', () => {
    expect(getTopServicePaymentDeadlineMs(order)).toBe(deadlineMs)
    expect(getTopServicePaymentRemainingSeconds(order, deadlineMs - 1)).toBe(1)
    expect(getTopServicePaymentRemainingSeconds(order, deadlineMs)).toBe(0)
    expect(getTopServicePaymentRemainingSeconds(order, deadlineMs + 1)).toBe(0)
  })

  it('formats a stable minute-and-second countdown', () => {
    expect(formatTopServicePaymentCountdown(order, deadlineMs - 5 * 60 * 1000)).toBe('05:00')
    expect(formatTopServicePaymentCountdown(order, deadlineMs - 61 * 1000)).toBe('01:01')
    expect(formatTopServicePaymentCountdown(order, deadlineMs)).toBe('00:00')
  })

  it('falls back to the legacy Beijing timestamp and then created-at plus five minutes', () => {
    expect(getTopServicePaymentDeadlineMs({ payExpiredAt: '2026-08-30 12:05:00' })).toBe(deadlineMs)
    expect(getTopServicePaymentDeadlineMs({ createdAt: '2026-08-30 12:00:00' })).toBe(deadlineMs)
  })
})

describe('top-service order action UI contract', () => {
  const source = readFileSync(new URL('../src/views/MerchantServices.vue', import.meta.url), 'utf8')

  it('keeps desktop and mobile payment/cancellation actions aligned', () => {
    expect(source.match(/@click="cancelPendingOrder\(order\)"/g)).toHaveLength(2)
    expect(source.match(/@click="repayOrder\(order\)"/g)).toHaveLength(2)
    expect(source).toContain("api.post(`/api/shop/top-service/orders/${encodeURIComponent(order.orderNo)}/cancel`)")
    expect(source).toContain('取消后会立即释放名额，操作不可撤销')
    expect(source).toContain('若已经打开 Credit 支付页，请不要再继续付款')
  })

  it('shows request feedback and releases both timers on unmount', () => {
    expect(source).toContain("isOrderAction(order, 'pay') ? '打开中…' : '继续支付'")
    expect(source).toContain("isOrderAction(order, 'refresh') ? '刷新中…'")
    expect(source).toContain("isOrderCancelling(order) ? '取消中…' : '取消订单'")
    expect(source).toContain('onUnmounted(() => {')
    expect(source).toContain('window.clearInterval(orderClockTimer)')
    expect(source).toContain('window.clearTimeout(expiredOrdersRefreshTimer)')
  })
})
