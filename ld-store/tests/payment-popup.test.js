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

  it('支付弹窗被拦截时回退到普通新标签页入口', () => {
    const anchor = {
      href: '',
      target: '',
      rel: '',
      style: {},
      click: vi.fn(),
    }
    const open = vi.fn(() => null)
    const appendChild = vi.fn()
    const removeChild = vi.fn()
    vi.stubGlobal('window', { innerWidth: 1280, open })
    vi.stubGlobal('navigator', { userAgent: 'Desktop Browser' })
    vi.stubGlobal('screen', { width: 1440, height: 900 })
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild, removeChild },
    })

    expect(openPaymentPopup('https://credit.example/pay')).toEqual({ popup: null, isPopup: false })
    expect(open).toHaveBeenCalledTimes(2)
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(anchor.href).toBe('https://credit.example/pay')
  })
})
