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
