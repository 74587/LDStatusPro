// @vitest-environment jsdom
/* global window, StorageEvent, DOMException */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  announcePaymentSignal,
  hasOpenPaymentPopup,
  normalizeOrderNo,
  PAYMENT_SIGNAL_STORAGE_KEY,
  readPaymentSignalFromLocation,
  resetPaymentReturnState,
  subscribePaymentPopup,
  trackPaymentPopup
} from '../src/utils/paymentReturn'

afterEach(() => {
  resetPaymentReturnState()
  vi.useRealTimers()
})

describe('payment return signal', () => {
  it('只接受本站支付回跳地址', () => {
    const origin = window.location.origin
    expect(readPaymentSignalFromLocation(`${origin}/pay/signal?orderNo=LS-1&result=success`, origin)).toEqual({
      orderNo: 'LS-1',
      result: 'success'
    })
    expect(readPaymentSignalFromLocation('https://credit.linux.do/pay', origin)).toBeNull()
    expect(readPaymentSignalFromLocation(`${origin}/order/LS-1`, origin)).toBeNull()
    expect(normalizeOrderNo('"><script>')).toBe('')
  })

  it('支付窗口回到本站或关闭后，只通知对应订单一次', async () => {
    vi.useFakeTimers()
    const popup = {
      closed: false,
      location: { href: 'https://credit.linux.do/pay' }
    }
    const events = []
    trackPaymentPopup('LS-1', popup)

    popup.location.href = `${window.location.origin}/pay/signal?orderNo=LS-1&result=success`
    await vi.advanceTimersByTimeAsync(500)
    popup.closed = true
    await vi.advanceTimersByTimeAsync(500)

    subscribePaymentPopup('LS-2', event => events.push(event))
    const stop = subscribePaymentPopup('LS-1', event => events.push(event.type))
    expect(events).toEqual(['returned', 'closed'])
    stop()
    subscribePaymentPopup('LS-1', event => events.push(`again:${event.type}`))
    expect(events).toEqual(['returned', 'closed'])
    expect(hasOpenPaymentPopup('LS-1')).toBe(false)
  })

  it('关窗发生在订单页订阅之前时，订阅后仍会补发', async () => {
    vi.useFakeTimers()
    const popup = { closed: false, location: { href: 'https://credit.linux.do/pay' } }
    trackPaymentPopup('LS-9', popup)
    popup.closed = true
    await vi.advanceTimersByTimeAsync(500)

    const events = []
    subscribePaymentPopup('LS-9', event => events.push(event.type))
    expect(events).toEqual(['closed'])
  })

  it('跨窗口的支付回跳会通过本地存储通知原页面', () => {
    const events = []
    subscribePaymentPopup('LS-3', event => events.push(event))
    const stored = announcePaymentSignal({ orderNo: 'LS-3', result: 'success' })
    window.dispatchEvent(new StorageEvent('storage', {
      key: PAYMENT_SIGNAL_STORAGE_KEY,
      newValue: JSON.stringify(stored)
    }))
    expect(events).toEqual([
      expect.objectContaining({ type: 'returned', orderNo: 'LS-3', result: 'success' })
    ])
  })

  it('读取跨域支付页地址失败时继续等待关闭', async () => {
    vi.useFakeTimers()
    const popup = {}
    Object.defineProperty(popup, 'closed', { value: false, writable: true })
    Object.defineProperty(popup, 'location', {
      get() {
        throw new DOMException('blocked')
      }
    })
    const events = []
    trackPaymentPopup('LS-4', popup)
    subscribePaymentPopup('LS-4', event => events.push(event.type))
    await vi.advanceTimersByTimeAsync(1000)
    expect(events).toEqual([])
    popup.closed = true
    await vi.advanceTimersByTimeAsync(500)
    expect(events).toEqual(['closed'])
  })
})
