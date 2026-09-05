// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SellerNotifications from '../src/views/SellerNotifications.vue'
const requests = vi.hoisted(() => ({ fetchNotificationChannel: vi.fn(), beginTelegramBinding: vi.fn(), changeTelegramChannel: vi.fn(), testTelegramChannel: vi.fn() }))
vi.mock('../src/services/shop/notificationChannelService', () => requests)
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,dGVzdA==') } }))
const initial = { available: true, status: 'unbound', telegramUsername: null, pendingExpiresAt: null, lastDelivery: null }
let wrapper
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial } }) })
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
async function open() { wrapper = mount(SellerNotifications); await flushPromises(); return wrapper }
function button(label) { return wrapper.findAll('button').find(b => b.text() === label) }
describe('seller notification settings', () => {
  it('opens a link for Telegram-side confirmation without a website confirmation button', async () => {
    requests.beginTelegramBinding.mockResolvedValue({ success: true, data: { url: 'https://t.me/test_bot?start=example', expiresAt: new Date(Date.now() + 600000).toISOString() } })
    await open(); await button('连接 Telegram').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('无需切回网页')
    expect(wrapper.find('a[href="https://t.me/test_bot?start=example"]').exists()).toBe(true)
    expect(button('确认绑定并开启')).toBeUndefined()
  })
  it('refreshes after returning from Telegram and displays accepted rather than read', async () => {
    await open()
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled', telegramUsername: 'seller', lastDelivery: { status: 'accepted', error: null, at: new Date().toISOString() } } })
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(wrapper.text()).toContain('已连接账号：@seller')
    expect(wrapper.text()).toContain('不代表你已阅读')
  })
  it('keeps the existing binding on a failed pause and permits retry', async () => {
    requests.fetchNotificationChannel.mockResolvedValue({ success: true, data: { ...initial, status: 'enabled' } })
    requests.changeTelegramChannel.mockResolvedValue({ success: false, error: '暂时无法保存' })
    await open(); await button('暂停通知').trigger('click'); await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('暂时无法保存')
    expect(button('暂停通知').attributes('disabled')).toBeUndefined()
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
})
