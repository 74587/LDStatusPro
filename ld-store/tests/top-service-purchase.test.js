// @vitest-environment jsdom
/* global window, document, structuredClone, URL, Event */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useTopServicePurchase } from '../src/composables/useTopServicePurchase'
import TopServiceOrderCard from '../src/components/seller/TopServiceOrderCard.vue'
import TopServicePlans from '../src/components/seller/TopServicePlans.vue'
import TopServiceProductPicker from '../src/components/seller/TopServiceProductPicker.vue'
import TopServiceOrderDialog from '../src/components/seller/TopServiceOrderDialog.vue'
import MerchantServices from '../src/views/MerchantServices.vue'
import { getTopServiceOrderPresentation, canPayTopServiceOrder, canCancelTopServiceOrder } from '../src/utils/topServiceOrder'
import { serviceOrder, serviceProducts, servicePackages } from './fixtures/top-service-data'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), prepare: vi.fn(), open: vi.fn(), close: vi.fn(), watch: vi.fn(), confirm: vi.fn(), stop: vi.fn() }))
vi.mock('@/utils/api', () => ({ api: { get: mocks.get, post: mocks.post } }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirm: mocks.confirm }) }))
vi.mock('@/utils/newTab', () => ({ preparePaymentPopup: mocks.prepare, openPaymentPopup: mocks.open, cleanupPreparedTab: mocks.close, watchPaymentPopup: mocks.watch }))
let wrappers = []
let containers = []
const dialog = () => new DOMWrapper(document.querySelector('.service-dialog-layer'))
let products, packages, currentOrders, visibility
const ok = data => ({ success: true, data })
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
async function harness(path = '/seller/services?tab=service') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push(path); await router.isReady()
  const wrapper = mount(defineComponent({ setup: useTopServicePurchase, template: '<div />' }), { global: { plugins: [router] } })
  wrappers.push(wrapper); await flushPromises()
  return { vm: wrapper.vm, wrapper, router }
}
async function choose(vm) { await vm.selectProduct(301); vm.selectService('global'); vm.selectDuration(3); await flushPromises() }
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-08-31T04:00:00Z'))
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  products = serviceProducts(); packages = servicePackages(); currentOrders = []
  mocks.get.mockImplementation(async url => {
    if (url.endsWith('/options')) return ok({ products: structuredClone(products), packages: structuredClone(packages) })
    const params = new URL(url, 'https://test.invalid').searchParams
    const found = currentOrders.filter(o => !params.get('search') || o.orderNo.includes(params.get('search')))
    return ok({ orders: structuredClone(found), pagination: { total: found.length, page: Number(params.get('page') || 1), totalPages: 2 } })
  })
  mocks.post.mockResolvedValue(ok({}))
  mocks.prepare.mockReturnValue({ closed: false })
  mocks.open.mockReturnValue({ popup: { closed: false }, isPopup: true })
  mocks.watch.mockReturnValue(mocks.stop)
  mocks.confirm.mockResolvedValue(true)
})
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers = []; containers.forEach(el => el.remove()); containers = []; vi.restoreAllMocks(); vi.resetAllMocks(); vi.useRealTimers() })

describe('promotion purchase state and recovery', () => {
  it('recovers omitted covers from every needed seller-list page without replacing purchase data or refetching cached covers', async () => {
    products.forEach(p => { delete p.imageUrl })
    const originalGet = mocks.get.getMockImplementation()
    const longCover = `https://images.example/cover.jpg?token=${'a'.repeat(800)}`
    mocks.get.mockImplementation(url => {
      if (!url.startsWith('/api/shop/my-products?')) return originalGet(url)
      const page = new URL(url, 'https://test.invalid').searchParams.get('page')
      return Promise.resolve(ok({ products: page === '1' ? [{ id: 999, image_url: '/other.jpg' }] : products.map(p => ({ id: p.id, image_url: longCover, categoryId: 999, name: 'other' })), pagination: { totalPages: 2 } }))
    })
    const { vm } = await harness()
    expect(vm.products[0].imageUrl).toBe(longCover)
    expect(vm.products[0].name).toBe(products[0].name)
    expect(vm.products[0].categoryId).toBe(products[0].categoryId)
    expect(mocks.get.mock.calls.filter(([url]) => url.startsWith('/api/shop/my-products?'))).toHaveLength(2)
    await vm.loadOptions()
    expect(vm.products[0].imageUrl).toBe(longCover)
    expect(mocks.get.mock.calls.filter(([url]) => url.startsWith('/api/shop/my-products?'))).toHaveLength(2)
  })
  it('keeps purchase available while a legacy cover lookup is slow or fails, and allows retry', async () => {
    products.forEach(p => { delete p.imageUrl })
    const originalGet = mocks.get.getMockImplementation()
    const images = defer()
    mocks.get.mockImplementation(url => url.startsWith('/api/shop/my-products?') ? images.promise : originalGet(url))
    const { vm } = await harness(); await choose(vm)
    expect(vm.canSubmit).toBe(true); expect(vm.products[0].imageLoading).toBe(true)
    images.resolve({ success: false }); await flushPromises()
    expect(vm.products[0].imageError).toBe(true); expect(vm.optionsError).toBe(''); expect(vm.canSubmit).toBe(true)
    mocks.get.mockImplementation(url => url.startsWith('/api/shop/my-products?') ? Promise.resolve(ok({ products: products.map(p => ({ id: p.id, image_url: '/cover.jpg' })) })) : originalGet(url))
    await vm.loadProductImages()
    expect(vm.products[0].imageError).toBe(false); expect(vm.products[0].imageUrl).toBe('/cover.jpg')
  })
  it('requires explicit choices, preserves valid choices, and invalidates changed quotes', async () => {
    const { vm } = await harness()
    expect(vm.selectedPackageType).toBe(''); expect(vm.canSubmit).toBe(false)
    await choose(vm); expect(vm.canSubmit).toBe(true)
    await vm.loadOptions(); expect(vm.selectedConfig.price).toBe(48)
    packages[0].options[1].price = 51
    await vm.loadOptions(); expect(vm.canSubmit).toBe(false); expect(vm.selectionNotice).toContain('价格已更新')
  })
  it('keeps selections on refresh failure but prevents submission from stale data', async () => {
    const { vm } = await harness(); await choose(vm)
    mocks.get.mockResolvedValueOnce({ success: false, error: '连接失败' })
    await vm.loadOptions()
    expect(vm.selectedConfig.price).toBe(48); expect(vm.optionsError).toContain('连接失败'); expect(vm.canSubmit).toBe(false)
  })
  it('blocks purchase when the quota snapshot is missing', async () => {
    delete products[0].quota.globalRemaining
    const { vm } = await harness(); await choose(vm)
    expect(vm.canSubmit).toBe(false); expect(vm.submitReason).toContain('暂未取得可用名额')
    await vm.submitOrder(); expect(mocks.post).not.toHaveBeenCalled()
  })
  it('opens payment before unrelated reads finish, freezes the quote, and submits once', async () => {
    const { vm } = await harness(); await choose(vm)
    const created = defer(); mocks.post.mockReturnValue(created.promise)
    const task = vm.submitOrder(); void vm.submitOrder(); await vm.selectProduct(302)
    expect(mocks.prepare).toHaveBeenCalledTimes(1); expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(vm.selectedProductId).toBe('301')
    const slowOptions = defer(); mocks.get.mockImplementationOnce(() => slowOptions.promise)
    const order = serviceOrder(); currentOrders = [order]
    created.resolve(ok({ order })); await task
    expect(mocks.open).toHaveBeenCalledTimes(1); expect(vm.focusedOrder.orderNo).toBe(order.orderNo)
    slowOptions.resolve(ok({ products, packages })); await flushPromises()
  })
  it.each([{ amount: 60 }, { categoryId: 11, boundCategoryId: 11 }, { durationDays: 7 }])('requires renewed confirmation when actual order differs: %o', async changes => {
    const { vm } = await harness(); await choose(vm)
    const order = serviceOrder(changes); currentOrders = [order]; mocks.post.mockResolvedValueOnce(ok({ order }))
    await vm.submitOrder(); expect(mocks.open).not.toHaveBeenCalled(); expect(vm.orderNotice).toContain('已更新')
    expect(vm.focusedOrder.amount).toBe(order.amount)
  })
  it('retains an actionable fallback when a browser blocks the popup', async () => {
    const { vm } = await harness(); await choose(vm)
    mocks.prepare.mockReturnValue(null)
    const order = serviceOrder(); currentOrders = [order]; mocks.post.mockResolvedValueOnce(ok({ order }))
    await vm.submitOrder(); expect(vm.fallbackPaymentUrl).toBe(order.paymentUrl)
    expect(vm.orderFeedback).toContain('未打开'); expect(vm.orderFeedback).toContain('继续支付'); expect(mocks.open).not.toHaveBeenCalled()
  })
  it('requires another review if the order changes while resuming payment', async () => {
    const { vm } = await harness(); const order = serviceOrder(); currentOrders = [order]; await vm.focusOrder(order)
    currentOrders = [serviceOrder({ amount: 60 })]
    mocks.get.mockResolvedValueOnce(ok({ paymentUrl: order.paymentUrl }))
    await vm.repayOrder(vm.focusedOrder)
    expect(vm.focusedOrder.amount).toBe(60); expect(vm.orderNotice).toContain('已更新')
    expect(mocks.open).not.toHaveBeenCalled(); expect(mocks.close).toHaveBeenCalled()
  })
  it('recovers an order after an ambiguous creation response without retrying the purchase', async () => {
    const { vm } = await harness(); await choose(vm)
    const order = serviceOrder(); products[0].currentTopOrder = order; currentOrders = [order]
    mocks.post.mockResolvedValueOnce({ success: false, status: 0, error: '请求超时' })
    await vm.submitOrder(); expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(vm.focusedOrder.orderNo).toBe(order.orderNo); expect(vm.orderNotice).toContain('已找到')
    expect(mocks.open).not.toHaveBeenCalled()
  })
  it('recovers a deep-linked order using exact matching independently from the history filters', async () => {
    currentOrders = [serviceOrder({ orderNo: 'LT-PREVIEW-001-extra' }), serviceOrder({ orderNo: 'LT-PREVIEW-001' })]
    const { vm } = await harness('/seller/services?tab=orders&orderNo=LT-PREVIEW-001')
    vm.orderFilterStatus = 'cancelled'; vm.orderSearch = 'elsewhere'
    expect(vm.focusedOrder.orderNo).toBe('LT-PREVIEW-001')
    expect(mocks.get.mock.calls.some(([url]) => url.includes('search=LT-PREVIEW-001&page=1'))).toBe(true)
  })
  it('checks paginated history when creation times out and the product is no longer in options', async () => {
    const { vm } = await harness(); await choose(vm)
    const order = serviceOrder(); currentOrders = [order]; products = []
    const originalGet = mocks.get.getMockImplementation()
    mocks.get.mockImplementation(async url => {
      const params = new URL(url, 'https://test.invalid').searchParams
      if (params.get('pageSize') === '100') return ok({ orders: params.get('page') === '2' ? [order] : [], pagination: { totalPages: 2 } })
      return originalGet(url)
    })
    mocks.post.mockResolvedValueOnce({ success: false, status: 0, error: '请求超时' })
    await vm.submitOrder()
    expect(vm.focusedOrder.orderNo).toBe(order.orderNo)
    expect(mocks.get.mock.calls.some(([url]) => url.includes('page=2&pageSize=100'))).toBe(true)
    expect(mocks.post).toHaveBeenCalledTimes(1); expect(mocks.open).not.toHaveBeenCalled()
  })
  it('reads order status every fifteen seconds only while visible and pending, and cleans up on unmount', async () => {
    const { vm, wrapper } = await harness(); currentOrders = [serviceOrder()]; await vm.focusOrder(currentOrders[0])
    mocks.get.mockClear(); await vi.advanceTimersByTimeAsync(14000); expect(mocks.get).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000); expect(mocks.get).toHaveBeenCalledTimes(1)
    visibility = 'hidden'; mocks.get.mockClear(); await vi.advanceTimersByTimeAsync(30000); expect(mocks.get).not.toHaveBeenCalled()
    visibility = 'visible'; currentOrders[0] = serviceOrder({ status: 'active', effectiveAt: '2026-08-31 12:00:00', canPay: false, canCancel: false })
    await vi.advanceTimersByTimeAsync(1000); await flushPromises(); expect(vm.focusedOrder.status).toBe('active')
    mocks.get.mockClear(); await vi.advanceTimersByTimeAsync(30000); expect(mocks.get).not.toHaveBeenCalled()
    wrapper.unmount(); await vi.advanceTimersByTimeAsync(30000); expect(mocks.get).not.toHaveBeenCalled()
  })
  it('coalesces return events and explicit checks into one in-flight verification', async () => {
    const { vm } = await harness(); currentOrders = [serviceOrder()]; await vm.focusOrder(currentOrders[0])
    const check = defer(); mocks.post.mockReturnValueOnce(check.promise)
    window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); void vm.refreshOrder(vm.focusedOrder)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    check.resolve(ok({ status: 'pending' })); await flushPromises()
    expect(vm.orderFeedback).toContain('不要重复付款')
  })
  it('limits repeated window returns to one automatic Credit check per thirty seconds without delaying manual checks', async () => {
    const { vm } = await harness(); currentOrders = [serviceOrder()]; await vm.focusOrder(currentOrders[0])
    visibility = 'hidden'; await vm.refreshOrder(vm.focusedOrder, { manual: false })
    expect(mocks.post).not.toHaveBeenCalled()
    visibility = 'visible'
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(5000)
      document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); await flushPromises()
    }
    expect(mocks.post).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(2)
    await vm.refreshOrder(vm.focusedOrder)
    expect(mocks.post).toHaveBeenCalledTimes(3)
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(3)
    expect(mocks.get.mock.calls.filter(([url]) => url.endsWith('/options'))).toHaveLength(1)
  })
  it('does not query Credit on record mounts, or after a stale popup reports a now-paid order', async () => {
    const pending = serviceOrder(); currentOrders = [pending]
    const { vm, wrapper } = await harness(`/seller/services?tab=orders&orderNo=${pending.orderNo}`)
    expect(vm.focusedOrder.orderNo).toBe(pending.orderNo); expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
    const next = await harness(`/seller/services?tab=orders&orderNo=${pending.orderNo}`)
    expect(mocks.post).not.toHaveBeenCalled()
    currentOrders = [serviceOrder({ status: 'active', effectiveAt: '2026-08-31 12:00:00' })]
    await next.vm.focusOrder(currentOrders[0]); await next.vm.refreshOrder(pending, { manual: false })
    window.dispatchEvent(new Event('focus')); await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
  })
  it('does not allow further payment at the deadline, and waits for server confirmation of expiry', async () => {
    const { vm } = await harness(); const order = serviceOrder({ payExpiredAtMs: Date.now() + 1000 }); currentOrders = [order]; await vm.focusOrder(order)
    await vi.advanceTimersByTimeAsync(1000)
    expect(canPayTopServiceOrder(vm.focusedOrder)).toBe(false)
    expect(getTopServiceOrderPresentation(vm.focusedOrder).message).toContain('以服务端结果为准')
    currentOrders = [{ ...order, status: 'expired', canPay: false, canCancel: false }]
    await vi.advanceTimersByTimeAsync(15000); expect(vm.focusedOrder.status).toBe('expired')
  })
  it('uses server truth when a payment wins the cancellation race', async () => {
    const { vm } = await harness(); currentOrders = [serviceOrder()]; await vm.focusOrder(currentOrders[0])
    mocks.post.mockImplementationOnce(async () => {
      currentOrders = [serviceOrder({ status: 'active', canPay: false, canCancel: false, effectiveAt: '2026-08-31 12:00:00' })]
      return { success: false, error: '订单已支付，无法取消' }
    })
    await vm.cancelOrder(vm.focusedOrder)
    expect(vm.focusedOrder.status).toBe('active'); expect(canCancelTopServiceOrder(vm.focusedOrder)).toBe(false)
    expect(vm.orderFeedback).not.toContain('名额已释放')
  })
  it('does not roll back a completed cancellation with an older in-flight poll', async () => {
    const { vm } = await harness(); currentOrders = [serviceOrder()]; await vm.focusOrder(currentOrders[0])
    const poll = defer(); mocks.get.mockReturnValueOnce(poll.promise)
    await vi.advanceTimersByTimeAsync(15000)
    const stale = currentOrders[0]
    currentOrders = [serviceOrder({ status: 'cancelled', canPay: false, canCancel: false })]
    await vm.cancelOrder(vm.focusedOrder)
    poll.resolve(ok({ orders: [stale] })); await flushPromises()
    expect(vm.focusedOrder.status).toBe('cancelled')
  })
  it('stops popup watchers when the page is unmounted', async () => {
    const { vm, wrapper } = await harness(); await choose(vm); const order = serviceOrder(); currentOrders = [order]; mocks.post.mockResolvedValueOnce(ok({ order }))
    await vm.submitOrder(); await flushPromises(); wrapper.unmount(); expect(mocks.stop).toHaveBeenCalled()
  })
  it('passes search and pagination to the history endpoint and ignores superseded responses', async () => {
    const { vm } = await harness(); const first = defer(); mocks.get.mockReturnValueOnce(first.promise)
    const old = vm.loadOrders(1); vm.orderSearch = '咖啡'; vm.orderFilterStatus = 'active'
    const newer = serviceOrder({ productName: '咖啡卡', orderNo: 'NEW' }); currentOrders = [newer]
    mocks.get.mockResolvedValueOnce(ok({ orders: [newer], pagination: { page: 2, total: 22, totalPages: 2 } }))
    await vm.loadOrders(2); first.resolve(ok({ orders: [], pagination: { page: 1 } })); await old
    expect(vm.orders[0].orderNo).toBe('NEW'); expect(vm.pagination.page).toBe(2)
    expect(mocks.get.mock.calls.at(-1)[0]).toContain('status=active&search=%E5%92%96%E5%95%A1&page=2')
  })
})

describe('shared promotion UI semantics', () => {
  it('uses product images and a prominent category, falling back to text only for unavailable images', async () => {
    const wrapper = mount(TopServiceProductPicker, { props: { products: serviceProducts(), modelValue: '302' } }); wrappers.push(wrapper)
    expect(wrapper.get('.selected-cover img').attributes('src')).toContain('coffee.jpg')
    expect(wrapper.get('.category-label strong').text()).toBe('卡券')
    expect(wrapper.get('h3').text()).toContain('周末咖啡')
    await wrapper.get('.selected-cover img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.empty-cover').text()).toBe('图片加载失败')
    await wrapper.get('.retry-images').trigger('click')
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.emitted('retry-images')).toHaveLength(1)
    await wrapper.setProps({ products: [{ ...serviceProducts()[1], imageUrl: '/updated-cover.jpg' }] })
    expect(wrapper.get('img').attributes('src')).toBe('/updated-cover.jpg')
  })
  it('clearly marks exhausted services and prevents selecting them', () => {
    const product = serviceProducts()[0]; product.quota.globalRemaining = 0
    const wrapper = mount(TopServicePlans, { props: { packages: servicePackages(), product } }); wrappers.push(wrapper)
    expect(wrapper.get('.sold-out .availability-notice strong').text()).toBe('暂无空闲名额')
    expect(wrapper.get('input[value="global"]').element.disabled).toBe(true)
    expect(wrapper.get('input[value="category"]').element.disabled).toBe(false)
  })
  it('opens a deep-linked record in a modal and leaves the record list in place when closing', async () => {
    const order = serviceOrder(); currentOrders = [order]
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
    await router.push(`/seller/services?tab=orders&orderNo=${order.orderNo}`); await router.isReady()
    const wrapper = mount(MerchantServices, { attachTo: document.body, global: { plugins: [router] } }); wrappers.push(wrapper); await flushPromises()
    expect(dialog().get('[role="dialog"]').text()).toContain(order.orderNo)
    expect(wrapper.find('#merchant-panel-orders .service-order').exists()).toBe(false)
    expect(wrapper.findAll('.record-row')).toHaveLength(1)
    expect(document.body.style.overflow).toBe('hidden')
    await dialog().get('[aria-label="关闭订单详情"]').trigger('click'); await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(router.currentRoute.value.query.orderNo).toBeUndefined()
    expect(wrapper.findAll('.record-row')).toHaveLength(1)
    expect(document.body.style.overflow).not.toBe('hidden')
    await wrapper.get('.record-search input').setValue('轻量')
    const trigger = wrapper.get('.record-row button'); trigger.element.focus()
    await trigger.trigger('click'); await flushPromises()
    await dialog().get('[aria-label="关闭订单详情"]').trigger('click'); await flushPromises()
    expect(wrapper.get('.services-content').attributes('inert')).toBeUndefined()
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.get('.record-search input').element.value).toBe('轻量')
  })
  it('traps focus in the order modal, handles Escape, and releases its scroll lock on unmount', async () => {
    const wrapper = mount(TopServiceOrderDialog, { attachTo: document.body, props: { open: true }, slots: { default: '<button class="last-action">核验结果</button>' } }); wrappers.push(wrapper); await flushPromises()
    const close = dialog().get('[aria-label="关闭订单详情"]')
    const last = dialog().get('.last-action')
    expect(document.activeElement).toBe(close.element)
    await close.trigger('keydown', { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last.element)
    await last.trigger('keydown', { key: 'Tab' }); expect(document.activeElement).toBe(close.element)
    await close.trigger('keydown', { key: 'Escape' }); expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount(); expect(document.body.style.overflow).not.toBe('hidden')
  })
  it('places the order modal outside the isolated route stage while preserving the seller theme context', async () => {
    const shell = document.createElement('div')
    shell.className = 'seller-shell'
    shell.innerHTML = '<div class="seller-workspace"><header class="seller-topbar"></header><div class="seller-view-stage"></div></div>'
    document.body.append(shell); containers.push(shell)
    const wrapper = mount(TopServiceOrderDialog, { attachTo: shell.querySelector('.seller-view-stage'), props: { open: true } }); wrappers.push(wrapper); await flushPromises()
    expect(dialog().element.closest('.seller-shell')).toBe(shell)
    expect(dialog().element.closest('.seller-workspace')).toBeNull()
    expect(shell.querySelector('.seller-view-stage [role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(dialog().get('[aria-label="关闭订单详情"]').element)
    wrapper.unmount()
    expect(shell.querySelector('.service-dialog-layer')).toBeNull()
  })
  it('keeps one continue-payment action, recovers blocked popups with a direct link, and removes that link after expiry', async () => {
    const order = serviceOrder()
    const wrapper = mount(TopServiceOrderCard, { props: { order, now: Date.now() }, global: { stubs: { RouterLink: true } } }); wrappers.push(wrapper)
    await wrapper.get('button.primary').trigger('click')
    expect(wrapper.emitted('pay')).toEqual([[order]])
    await wrapper.setProps({ fallbackUrl: order.paymentUrl })
    expect(wrapper.findAll('.primary')).toHaveLength(1)
    expect(wrapper.get('a.primary').text()).toBe('继续支付')
    expect(wrapper.get('a.primary').attributes()).toMatchObject({ href: order.paymentUrl, target: '_blank', rel: 'noopener noreferrer' })
    expect(wrapper.text()).not.toContain('打开 Credit 支付页')
    await wrapper.setProps({ action: 'refresh' })
    expect(wrapper.find('a.primary').exists()).toBe(false)
    expect(wrapper.get('button.primary').element.disabled).toBe(true)
    await wrapper.setProps({ action: '', now: Date.now() + 300_001 })
    expect(wrapper.find('.primary').exists()).toBe(false)
  })
  it('never offers payment or cancellation while a late payment refund is unresolved', () => {
    const order = serviceOrder({ paymentReversalStatus: 'unknown' })
    expect(canPayTopServiceOrder(order)).toBe(false); expect(canCancelTopServiceOrder(order)).toBe(false)
  })
  it('preserves the order deep link when the pending banner also changes tabs', async () => {
    const order = serviceOrder(); currentOrders = [order]; products[0].currentTopOrder = order
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
    await router.push('/seller/services?tab=service'); await router.isReady()
    const wrapper = mount(MerchantServices, { global: { plugins: [router] } }); wrappers.push(wrapper); await flushPromises()
    await wrapper.get('.pending-banner button').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'orders', orderNo: order.orderNo })
    await wrapper.get('.records-heading button').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'service' })
  })
  it.each([
    [{ status: 'active', isSuspendedForCategory: true }, '已支付，暂停展示'],
    [{ status: 'suspended' }, '服务已暂停'],
    [{ status: 'expired', effectiveAt: '2026-08-30 12:00:00' }, '服务已结束'],
    [{ status: 'expired' }, '支付超时'],
    [{ paymentReversalStatus: 'refunded' }, '积分已退回'],
    [{ paymentReversalStatus: 'unknown' }, '退款待核验']
  ])('presents %o as %s', (changes, label) => { expect(getTopServiceOrderPresentation(serviceOrder(changes)).label).toBe(label) })
  it('explains independent featured placement and uses native radio controls', () => {
    const wrapper = mount(TopServicePlans, { props: { packages: servicePackages(), product: serviceProducts()[1], selectedType: 'global' } }); wrappers.push(wrapper)
    expect(wrapper.text()).not.toContain('同时覆盖浏览“全部”分类')
    expect(wrapper.findAll('input[name="promotion-service"]')).toHaveLength(2)
    expect(wrapper.findAll('input[name="promotion-duration"]:checked')).toHaveLength(0)
  })
  it('exposes the countdown as a silent timer and never equates a return with success', () => {
    const wrapper = mount(TopServiceOrderCard, { props: { order: serviceOrder(), now: Date.now() }, global: { stubs: { RouterLink: true } } }); wrappers.push(wrapper)
    expect(wrapper.get('[role="timer"]').attributes('aria-live')).toBe('off')
    expect(wrapper.text()).toContain('待支付'); expect(wrapper.text()).not.toContain('支付已完成')
  })
  it('only offers a payment check for pending orders and keeps refund checks separate', async () => {
    const wrapper = mount(TopServiceOrderCard, { props: { order: serviceOrder() }, global: { stubs: { RouterLink: true } } }); wrappers.push(wrapper)
    expect(wrapper.text()).toContain('检查支付结果')
    for (const status of ['active', 'expired', 'cancelled', 'suspended']) {
      await wrapper.setProps({ order: serviceOrder({ status, canPay: false, canCancel: false }) })
      expect(wrapper.text()).not.toContain('检查支付结果'); expect(wrapper.text()).not.toContain('刷新核验结果')
      if (['expired', 'cancelled'].includes(status)) expect(wrapper.get('.restart').text()).toBe('选择更多推广方案')
    }
    await wrapper.setProps({ order: serviceOrder({ status: 'expired', paymentReversalStatus: 'unknown' }) })
    expect(wrapper.text()).toContain('检查退款进度'); expect(wrapper.text()).not.toContain('检查支付结果')
    await wrapper.setProps({ order: serviceOrder({ status: 'expired', paymentReversalStatus: 'refunded' }) })
    expect(wrapper.findAll('.order-actions button')).toHaveLength(0)
  })
})
