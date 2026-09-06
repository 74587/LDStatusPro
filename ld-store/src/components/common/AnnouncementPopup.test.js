// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import Popup from './AnnouncementPopup.vue'
import { dismissAnnouncement } from '@/utils/announcementPreferences'
const fixtures = vi.hoisted(() => ({ state: null, account: null, route: null }))
vi.mock('@/composables/useAnnouncement', () => ({ useAnnouncement: () => fixtures.state }))
vi.mock('@/stores/user', () => ({ useUserStore: () => fixtures.account }))
vi.mock('vue-router', () => ({ useRoute: () => fixtures.route }))
vi.mock('@/utils/announcementTelemetry', () => ({ announcementImpression: {}, trackAnnouncement: vi.fn() }))
vi.mock('@/services/announcementService', () => ({ fetchAnnouncementStates: vi.fn(), saveAnnouncementState: vi.fn() }))
let wrapper
const announcement = (version = 4) => ({ id: 12, mode: 'popup', title: 'Telegram 通知', content: '正文', reminderVersion: version })
const dialog = () => document.querySelector('dialog')
async function open() {
  wrapper = mount(Popup, { attachTo: document.body, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
}
async function close() { dialog().dispatchEvent(new Event('cancel', { cancelable: true })); await flushPromises() }
async function navigate(name, path) {
  fixtures.route.name = name; fixtures.route.fullPath = path; fixtures.route.path = path.split(/[?#]/)[0]
  await flushPromises()
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  fixtures.state = { announcementItems: ref([announcement()]), announcementPreferencesReady: ref(true) }
  fixtures.account = reactive({ sessionReady: true, isLoggedIn: false, currentUser: null })
  fixtures.route = reactive({ name: 'Home', fullPath: '/', path: '/', meta: {} })
})
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; document.body.style.overflow = ''; localStorage.clear(); sessionStorage.clear(); vi.useRealTimers() })
it.each([['Home', '/'], ['SellerDashboard', '/seller']])('opens on %s even with an old session cap', async (name, path) => {
  sessionStorage.setItem('ld-announcement-session:guest', 'true')
  await navigate(name, path); await open(); expect(dialog().open).toBe(true)
  expect(document.activeElement.id).toBe('announcement-popup-title')
})
it('plain close restores focus and scroll, stays closed on polling, then reopens after reload', async () => {
  const button = document.createElement('button'); document.body.append(button); button.focus()
  await open(); await close()
  expect(dialog().open).toBe(false)
  expect(document.body.style.overflow).toBe('')
  expect(document.activeElement).toBe(button)
  fixtures.state.announcementItems.value = [announcement(), { ...announcement(), id: 13 }]
  await flushPromises(); expect(dialog().open).toBe(false)
  wrapper.unmount(); await open(); expect(dialog().open).toBe(true)
})
it('plain close reopens on seller entry and on returning home without remounting', async () => {
  await open(); await close()
  await navigate('SellerDashboard', '/seller'); expect(dialog().open).toBe(true)
  await close(); await navigate('Home', '/'); expect(dialog().open).toBe(true)
})
it('does not open on order handling and reopens when returning to a safe route', async () => {
  await open(); await navigate('SellerOrders', '/seller/orders'); expect(dialog().open).toBe(false)
  await navigate('SellerDashboard', '/seller'); expect(dialog().open).toBe(true)
})
it('waits for session restoration and account preferences', async () => {
  fixtures.account.sessionReady = false; fixtures.state.announcementPreferencesReady.value = false
  await open(); expect(dialog().open).toBe(false)
  fixtures.account.sessionReady = true; await flushPromises(); expect(dialog().open).toBe(false)
  fixtures.state.announcementPreferencesReady.value = true; await flushPromises(); expect(dialog().open).toBe(true)
})
it.each(['today', 'forever'])('%s suppression survives seller navigation and reload', async mode => {
  await open()
  const text = mode === 'today' ? '今日不再显示' : '从此不再显示'
  const button = [...document.querySelectorAll('button')].find(item => item.textContent === text)
  button.click(); await flushPromises(); expect(dialog().open).toBe(false)
  await navigate('SellerDashboard', '/seller'); expect(dialog().open).toBe(false)
  wrapper.unmount(); await open(); expect(dialog().open).toBe(false)
})
it('today suppression expires at Beijing midnight on the next entry', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-09-06T15:59:59Z'))
  dismissAnnouncement('guest', announcement(), 'today')
  await open(); expect(dialog().open).toBe(false)
  vi.setSystemTime(new Date('2026-09-06T16:00:00Z'))
  await navigate('SellerDashboard', '/seller'); expect(dialog().open).toBe(true)
})
it('a new reminder version is eligible on the next entry after permanent suppression', async () => {
  dismissAnnouncement('guest', announcement(), 'forever')
  await open(); expect(dialog().open).toBe(false)
  fixtures.state.announcementItems.value = [announcement(5)]
  await navigate('SellerDashboard', '/seller'); expect(dialog().open).toBe(true)
})
it('switching accounts does not inherit the previous account suppression', async () => {
  fixtures.account.isLoggedIn = true; fixtures.account.currentUser = { site: 'linux.do', id: 'first' }
  dismissAnnouncement('linux.do:first', announcement(), 'forever')
  await open(); expect(dialog().open).toBe(false)
  fixtures.account.currentUser = { site: 'linux.do', id: 'second' }
  await flushPromises(); expect(dialog().open).toBe(true)
})
it('withdrawal or expiry closes the dialog without immediately opening another', async () => {
  await open(); fixtures.state.announcementItems.value = [{ ...announcement(), id: 13 }]
  await flushPromises(); expect(dialog().open).toBe(false)
})
it('switching an open item to banner closes the popup', async () => {
  await open(); fixtures.state.announcementItems.value = [{ ...announcement(), mode: 'banner' }]
  await flushPromises(); expect(dialog().open).toBe(false)
})

it('home tab, filter and hash changes retain the plain close, including after polling', async () => {
  await open(); await close()
  for (const path of ['/?section=hotboard', '/?section=buy', '/?section=stores', '/?section=products', '/?section=products&sort=price', '/#home-title']) {
    await navigate('Home', path)
    expect(dialog().open).toBe(false)
    fixtures.state.announcementItems.value = [announcement()]
    await flushPromises(); expect(dialog().open).toBe(false)
  }
  wrapper.unmount(); await open(); expect(dialog().open).toBe(true)
})
it('returning from another page to a home tab is a new visit', async () => {
  await navigate('Home', '/?section=hotboard'); await open(); await close()
  await navigate('SellerOrders', '/seller/orders'); expect(dialog().open).toBe(false)
  await navigate('Home', '/?section=buy'); expect(dialog().open).toBe(true)
})
