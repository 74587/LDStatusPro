/* global window, document, Event */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '../src/stores/ui'
import SellerNotifications from '../src/views/SellerNotifications.vue'
const requests = vi.hoisted(() => ({ fetchNotificationChannel: vi.fn(), beginTelegramBinding: vi.fn(), changeTelegramChannel: vi.fn(), testTelegramChannel: vi.fn() }))
vi.mock('../src/services/shop/notificationChannelService', () => requests)
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,dGVzdA==') } }))
const initial = { available: true, status: 'unbound', telegramUsername: null, pendingExpiresAt: null, lastDelivery: null }
let wrapper
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); setActivePinia(createPinia()); requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial } }) })
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.useRealTimers() })
async function open() { wrapper = mount(SellerNotifications, { attachTo: document.body }); await flushPromises(); return wrapper }
function button(label) { return wrapper.findAll('button').find(b => b.text() === label) }
describe('seller notification settings', () => {
  it('opens a link for Telegram-side confirmation without a website confirmation button', async () => {
    requests.beginTelegramBinding.mockResolvedValue({ success: true, data: { url: 'https://t.me/test_bot?start=example', expiresAt: new Date(Date.now() + 600000).toISOString() } })
    await open(); await button('连接 Telegram').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('无需切回网页')
    expect(document.activeElement?.textContent).toBe('在 Telegram 内确认连接')
    expect(wrapper.find('a[href="https://t.me/test_bot?start=example"]').exists()).toBe(true)
    expect(button('确认绑定并开启')).toBeUndefined()
  })
  it('refreshes after returning from Telegram and displays accepted rather than read', async () => {
    await open()
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled', telegramUsername: 'seller', lastDelivery: { status: 'accepted', error: null, at: new Date().toISOString() } } })
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(wrapper.text()).toContain('@seller')
    expect(wrapper.text()).toContain('不代表你已阅读')
  })
  it('keeps the existing binding on a failed pause and permits retry', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled' } })
    requests.changeTelegramChannel.mockResolvedValue({ success: false, error: '暂时无法保存' })
    await open(); await button('暂停通知').trigger('click'); await flushPromises()
    expect(useUiStore().toasts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'error', message: '暂时无法保存' })]))
    expect(wrapper.find('.notification-error').exists()).toBe(false)
    expect(button('暂停通知').attributes('disabled')).toBeUndefined()
  })
  it('uses the global success toast when a test notification is accepted', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled' } })
    requests.testTelegramChannel.mockResolvedValue({ success: true, data: null })
    await open(); await button('发送测试通知').trigger('click'); await flushPromises()
    expect(useUiStore().toasts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'success', message: '测试通知已排队，可能延迟几秒，请稍候。' })]))
    expect(wrapper.find('.notification-feedback').exists()).toBe(false)
  })
  it('does not offer binding when the provider is not configured', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, available: false } })
    await open(); expect(button('连接 Telegram').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('暂未开放')
  })
  it('requires explicit unbind confirmation and never auto-resumes unavailable channels', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'unavailable' } })
    await open(); expect(requests.changeTelegramChannel).not.toHaveBeenCalled()
    await button('解除绑定').trigger('click'); expect(button('确认解除绑定')).toBeDefined()
    expect(requests.changeTelegramChannel).not.toHaveBeenCalled()
  })
  it('focuses the safe unbind choice and preserves confirmation after a failed request', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled' } })
    requests.changeTelegramChannel.mockResolvedValue({ success: false, error: '暂时无法解除绑定' })
    await open(); await button('解除绑定').trigger('click'); await flushPromises()
    expect(document.activeElement).toBe(button('保留绑定').element)
    await button('确认解除绑定').trigger('click'); await flushPromises()
    expect(button('确认解除绑定')).toBeDefined()
    expect(useUiStore().toasts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'error', message: '暂时无法解除绑定' })]))
    await wrapper.find('#notification-unbind-confirm').trigger('keydown', { key: 'Escape' }); await flushPromises()
    expect(button('确认解除绑定')).toBeUndefined()
    expect(document.activeElement).toBe(button('解除绑定').element)
  })
  it('returns focus to connect after a successful unbind', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled' } })
    requests.changeTelegramChannel.mockResolvedValue({ success: true, data: { ...initial } })
    await open(); await button('解除绑定').trigger('click'); await button('确认解除绑定').trigger('click'); await flushPromises()
    expect(document.activeElement).toBe(button('连接 Telegram').element)
  })
  it('polls only while visible and never overlaps a slow status request', async () => {
    const pending = new Date(Date.now() + 600000).toISOString()
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, pendingExpiresAt: pending } })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await open()
    let resolve
    requests.fetchNotificationChannel.mockImplementation(() => new Promise(done => { resolve = done }))
    await vi.advanceTimersByTimeAsync(10000)
    expect(requests.fetchNotificationChannel).toHaveBeenCalledTimes(2)
    resolve({ success: true, data: { ...initial, status: 'enabled' } }); await flushPromises()
    expect(wrapper.text()).toContain('已开启')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await vi.advanceTimersByTimeAsync(10000)
    expect(requests.fetchNotificationChannel).toHaveBeenCalledTimes(2)
  })
  it('removes an expired mobile link without extending its expiry', async () => {
    requests.beginTelegramBinding.mockResolvedValue({ success: true, data: { url: 'https://t.me/test_bot?start=example', expiresAt: new Date(Date.now() + 5000).toISOString() } })
    await open(); await button('连接 Telegram').trigger('click'); await flushPromises()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await vi.advanceTimersByTimeAsync(6000)
    expect(wrapper.text()).toContain('绑定链接已失效')
    expect(wrapper.find('a[href="https://t.me/test_bot?start=example"]').exists()).toBe(false)
  })

})
