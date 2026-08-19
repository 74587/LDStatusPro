import { afterEach, describe, expect, it, vi } from 'vitest'
import { openPaymentPopup, preparePaymentPopup } from '../src/utils/newTab'

describe('LDC 支付窗口', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('移动端会在用户点击时同步预开标签页并复用', () => {
    const popup = { closed: false, location: { href: '' }, opener: {} }
    const open = vi.fn(() => popup)
    vi.stubGlobal('window', { innerWidth: 375, open })
    vi.stubGlobal('navigator', { userAgent: 'Mobile Safari' })
    vi.stubGlobal('screen', { width: 375, height: 812 })

    const prepared = preparePaymentPopup()
    expect(open).toHaveBeenCalledTimes(1)
    expect(prepared).toBe(popup)

    const result = openPaymentPopup('https://credit.example/pay', prepared)
    expect(open).toHaveBeenCalledTimes(1)
    expect(popup.location.href).toBe('https://credit.example/pay')
    expect(result).toEqual({ popup, isPopup: true })
  })
})
