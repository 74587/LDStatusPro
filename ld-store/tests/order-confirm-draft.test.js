import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  ORDER_CONFIRM_DRAFT_KEY,
  ORDER_CONFIRM_DRAFT_TTL_MS,
  normalizeOrderConfirmDraft,
  readStoredOrderConfirmDraft,
  shouldPreserveCheckoutDraft,
  useCheckoutStore,
} from '../src/stores/checkout'

function createMemoryStorage() {
  const data = new Map()
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null },
    setItem(key, value) { data.set(key, String(value)) },
    removeItem(key) { data.delete(key) },
  }
}

describe('订单确认草稿', () => {
  let storage

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    vi.stubGlobal('window', { sessionStorage: storage })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('只接受 30 分钟内且商品编号有效的草稿', () => {
    const live = normalizeOrderConfirmDraft({
      productId: 12,
      quantity: 3,
      couponClaimId: 9,
      sourceFullPath: '/product/12',
      sourceScrollY: 420,
      restoreOnReturn: true,
      updatedAt: Date.now() - ORDER_CONFIRM_DRAFT_TTL_MS + 1,
    })
    expect(live).toMatchObject({
      productId: 12,
      quantity: 3,
      couponClaimId: 9,
      couponSelectionMode: 'manual',
      restoreOnReturn: true,
    })

    expect(normalizeOrderConfirmDraft({ ...live, updatedAt: Date.now() - ORDER_CONFIRM_DRAFT_TTL_MS - 1 })).toBeNull()
    expect(normalizeOrderConfirmDraft({ ...live, productId: 0 })).toBeNull()
  })

  it('清理损坏的 sessionStorage 数据', () => {
    storage.setItem(ORDER_CONFIRM_DRAFT_KEY, '{broken')
    expect(readStoredOrderConfirmDraft(storage)).toBeNull()
    expect(storage.getItem(ORDER_CONFIRM_DRAFT_KEY)).toBeNull()
  })

  it('在确认页和商品详情之间同步数量、券与返回标记', () => {
    const store = useCheckoutStore()
    store.startCheckout({
      productId: 28,
      quantity: 2,
      sourceFullPath: '/product/28#comments',
      sourceScrollY: 760,
    })
    store.updateCheckout(28, { quantity: 4, couponClaimId: 16, couponSelectionMode: 'manual' })
    store.markReturnToProduct(28)

    const returning = store.consumeProductReturn(28)
    expect(returning).toMatchObject({
      productId: 28,
      quantity: 4,
      couponClaimId: 16,
      couponSelectionMode: 'manual',
      sourceFullPath: '/product/28#comments',
      sourceScrollY: 760,
      restoreOnReturn: true,
    })
    expect(store.getDraft(28).restoreOnReturn).toBe(false)
    expect(JSON.parse(storage.getItem(ORDER_CONFIRM_DRAFT_KEY))).toMatchObject({
      quantity: 4,
      couponClaimId: 16,
      couponSelectionMode: 'manual',
    })

    store.clearCheckout(28)
    expect(store.getDraft()).toBeNull()
    expect(storage.getItem(ORDER_CONFIRM_DRAFT_KEY)).toBeNull()
  })

  it('切换商品时强制从 1 件开始且不会带入上一件商品的优惠券', () => {
    const store = useCheckoutStore()
    store.startCheckout({ productId: 11624, quantity: 2000 })
    store.updateCheckout(11624, { couponClaimId: 99 })
    store.startCheckout({ productId: 11625, quantity: 100 })

    expect(store.getDraft(11624)).toBeNull()
    expect(store.getDraft(11625)).toMatchObject({ quantity: 1, couponClaimId: null, couponSelectionMode: 'auto' })
  })

  it('商品编号不受数量上限影响，并保留上限内超过 1000 的兑换数量', () => {
    expect(normalizeOrderConfirmDraft({
      productId: 11624,
      quantity: 2000,
      updatedAt: Date.now(),
    })).toMatchObject({
      productId: 11624,
      quantity: 2000,
    })
  })

  it('草稿中的兑换数量最多归一化为平台单笔 5000 件', () => {
    expect(normalizeOrderConfirmDraft({
      productId: 11624,
      quantity: 5001,
      updatedAt: Date.now(),
    })).toMatchObject({
      productId: 11624,
      quantity: 5000,
    })
  })

  it('只有直接返回当前商品详情时才保留确认页草稿', () => {
    expect(shouldPreserveCheckoutDraft({
      name: 'ProductDetail',
      params: { id: '28' },
    }, 28)).toBe(true)
    expect(shouldPreserveCheckoutDraft({ name: 'Home' }, 28)).toBe(false)
    expect(shouldPreserveCheckoutDraft({
      name: 'ProductDetail',
      params: { id: '29' },
    }, 28)).toBe(false)
  })

  it('返回广场会结束当前确认流程，下一件商品默认 1 件', () => {
    const store = useCheckoutStore()
    store.startCheckout({ productId: 28, quantity: 1 })
    store.updateCheckout(28, { quantity: 100 })

    if (!shouldPreserveCheckoutDraft({ name: 'Home' }, 28)) {
      store.clearCheckout(28)
    }
    store.startCheckout({ productId: 29, quantity: 1 })

    expect(store.getDraft(29)).toMatchObject({
      productId: 29,
      quantity: 1,
      couponClaimId: null,
      couponSelectionMode: 'auto',
    })
  })

  it('手动不用券的草稿在继续调整数量后仍保持手动模式', () => {
    const store = useCheckoutStore()
    store.startCheckout({ productId: 36, quantity: 1 })
    store.updateCheckout(36, { couponClaimId: null, couponSelectionMode: 'manual' })
    store.updateCheckout(36, { quantity: 3 })

    expect(store.getDraft(36)).toMatchObject({
      productId: 36,
      quantity: 3,
      couponClaimId: null,
      couponSelectionMode: 'manual',
    })
  })
})
