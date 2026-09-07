// @vitest-environment jsdom
/* global process */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SellerFulfillment from '../src/views/seller/SellerFulfillment.vue'
import { useSellerFulfillmentStore } from '../src/stores/sellerFulfillment'
import { getCheckoutSubmissionError } from '../src/composables/orders/useCheckoutSubmission'

const m = vi.hoisted(() => ({ policy: vi.fn(), seller: vi.fn(), ack: vi.fn(), user: null }))
vi.mock('@/services/shop/fulfillmentService', () => ({
  fetchFulfillmentPolicy: m.policy,
  fetchSellerFulfillment: m.seller,
  acknowledgeFulfillment: m.ack
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => m.user }))

const rules = {
  version: 'shipment-72h-v1', enabled: true, enabledAt: '2026-09-01T00:00:00Z',
  deliveryHours: 72, offlineHours: 48, strikeWindowDays: 30, strikeThreshold: 3,
  restrictionHours: 168, ruleUrl: '/docs/shipping-deadline'
}
const restriction = { id: 7, startedAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-08T00:00:00Z', releasedAt: null }
const sellerState = overrides => ({
  enabled: true, accepted: true, policyVersion: rules.version, validCount: 0,
  threshold: 3, windowDays: 30, restrictionHours: 168, activeRestriction: null,
  history: [], restrictions: [], ruleUrl: rules.ruleUrl, supportUrl: '/support', ...overrides
})
const ok = data => ({ success: true, data })
const fail = (error = '请求失败', errorCode) => ({ success: false, error, errorCode })
const link = { props: ['to'], template: '<a :href="typeof to === \'string\' ? to : \'#\'"><slot /></a>' }
let wrappers = []

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  m.user = reactive({ sessionKey: 'linux.do:18' })
  m.policy.mockResolvedValue(ok({ ...rules }))
  m.seller.mockResolvedValue(ok(sellerState()))
  m.ack.mockResolvedValue(ok(sellerState()))
})

afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers = []
})

async function mountPage() {
  const wrapper = mount(SellerFulfillment, { global: { stubs: { RouterLink: link } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('卖家发货与履约状态源', () => {
  it('合并并去重并发读取请求', async () => {
    const store = useSellerFulfillmentStore()
    const first = store.refresh({ force: true })
    const second = store.refresh({ force: true })
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(m.policy).toHaveBeenCalledTimes(1)
    expect(m.seller).toHaveBeenCalledTimes(1)
  })

  it('账号切换时立即清空旧状态，并只保留新账号结果', async () => {
    const store = useSellerFulfillmentStore()
    await store.refresh({ force: true })
    expect(store.loaded).toBe(true)

    m.user.sessionKey = 'linux.do:19'
    await nextTick()
    expect(store.loaded).toBe(false)
    expect(store.policy).toBeNull()
    expect(store.status).toBeNull()

    m.seller.mockResolvedValue(ok(sellerState({ validCount: 2 })))
    await store.refresh({ force: true })
    expect(store.status.validCount).toBe(2)
  })

  it('阻止重复确认请求，但允许受限卖家确认规则', async () => {
    m.seller.mockResolvedValue(ok(sellerState({ accepted: false, activeRestriction: restriction })))
    let resolveAcknowledgement
    m.ack.mockReturnValue(new Promise(resolve => { resolveAcknowledgement = resolve }))
    const store = useSellerFulfillmentStore()
    await store.refresh({ force: true })

    const first = store.acknowledgeCurrent()
    expect(await store.acknowledgeCurrent()).toBe(false)
    expect(m.ack).toHaveBeenCalledTimes(1)
    resolveAcknowledgement(ok(sellerState({ activeRestriction: restriction })))
    expect(await first).toBe(true)
    expect(store.status.activeRestriction).toEqual(restriction)
  })
})

describe('独立发货与履约页面', () => {
  it('必须显式勾选，确认后原位更新且不混淆已有交易限制', async () => {
    m.seller.mockResolvedValue(ok(sellerState({ accepted: false, activeRestriction: restriction })))
    m.ack.mockResolvedValue(ok(sellerState({ activeRestriction: restriction })))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('规则待确认')
    expect(wrapper.text()).toContain('新增交易受限')
    const checkbox = wrapper.get('input[type="checkbox"]')
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.element.disabled).toBe(true)
    await checkbox.setValue(true)
    expect(submit.element.disabled).toBe(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(m.ack).toHaveBeenCalledWith(rules.version)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('当前版本已经确认')
    expect(wrapper.text()).toContain('当前交易限制仍按原截止时间执行')
    expect(wrapper.text()).toContain('新增交易受限至')
  })

  it('规则版本不一致时禁用确认，并要求重新加载当前规则', async () => {
    m.seller
      .mockResolvedValueOnce(ok(sellerState({ accepted: false, policyVersion: 'shipment-48h-old' })))
      .mockResolvedValue(ok(sellerState({ accepted: false })))
    const wrapper = await mountPage()

    expect(wrapper.get('input[type="checkbox"]').element.disabled).toBe(true)
    expect(wrapper.text()).toContain('发货规则已更新')
    await wrapper.get('.confirmation-retry').trigger('click')
    await flushPromises()
    expect(wrapper.get('input[type="checkbox"]').element.disabled).toBe(false)
    expect(wrapper.find('.confirmation-error').exists()).toBe(false)
  })

  it('读取失败可以重试，并覆盖空记录和有效记录展示', async () => {
    m.policy.mockResolvedValueOnce(fail('规则服务暂不可用')).mockResolvedValue(ok({ ...rules }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('暂时无法核对发货规则')
    expect(wrapper.text()).toContain('规则服务暂不可用')

    await wrapper.get('.fulfillment-load-error button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无超时履约记录')

    m.seller.mockResolvedValue(ok(sellerState({
      validCount: 1,
      history: [{
        id: 9, orderNo: 'ORDER-20260907', occurredAt: '2026-09-07T01:30:00Z',
        penaltyId: null, exemptReason: null, revokedAt: null, revokeReason: null
      }]
    })))
    await useSellerFulfillmentStore().refresh({ force: true })
    await flushPromises()
    expect(wrapper.text()).toContain('ORDER-20260907')
    expect(wrapper.text()).toContain('有效记录')
  })

  it('规则关闭时显示未启用状态，不误报为已经确认', async () => {
    m.policy.mockResolvedValue(ok({ ...rules, enabled: false }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('发货规则暂未启用')
    expect(wrapper.text()).toContain('规则未启用')
    expect(wrapper.text()).not.toContain('规则已确认')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})

describe('入口与买家错误文案', () => {
  it('固定导航、全局提醒、独立路由和经营状态统一指向新页面', () => {
    const layout = readFileSync(resolve(process.cwd(), 'src/layouts/SellerLayout.vue'), 'utf8')
    const router = readFileSync(resolve(process.cwd(), 'src/router/index.js'), 'utf8')
    const dashboard = readFileSync(resolve(process.cwd(), 'src/views/seller/SellerDashboard.vue'), 'utf8')
    expect(layout).toContain("label: '发货与履约', to: '/seller/fulfillment'")
    expect(layout).toContain('class="seller-fulfillment-gate"')
    expect(layout).not.toContain('seller-fulfillment-gate-close')
    expect(router).toContain("name: 'SellerFulfillment'")
    expect(dashboard).toContain("href: '/seller/fulfillment'")
    expect(dashboard).not.toContain('SellerFulfillmentPanel')
  })

  it('结算页把未确认错误翻译为买家可理解的中性提示', () => {
    expect(getCheckoutSubmissionError({
      success: false,
      errorCode: 'FULFILLMENT_RULE_NOT_ACCEPTED',
      error: '卖家后台操作指令'
    })).toBe('该物品暂时无法兑换：卖家尚未确认最新发货规则。请稍后再试或选择其他物品。')
    expect(getCheckoutSubmissionError({ success: false, error: { message: '余额不足' } })).toBe('余额不足')
  })
})
