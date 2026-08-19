import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  ORDER_CONFIRM_DRAFT_KEY,
  ORDER_CONFIRM_DRAFT_TTL_MS,
  normalizeOrderConfirmDraft,
  readStoredOrderConfirmDraft,
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
    expect(live).toMatchObject({ productId: 12, quantity: 3, couponClaimId: 9, restoreOnReturn: true })

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
    store.updateCheckout(28, { quantity: 4, couponClaimId: 16 })
    store.markReturnToProduct(28)

    const returning = store.consumeProductReturn(28)
    expect(returning).toMatchObject({
      productId: 28,
      quantity: 4,
      couponClaimId: 16,
      sourceFullPath: '/product/28#comments',
      sourceScrollY: 760,
      restoreOnReturn: true,
    })
    expect(store.getDraft(28).restoreOnReturn).toBe(false)
    expect(JSON.parse(storage.getItem(ORDER_CONFIRM_DRAFT_KEY))).toMatchObject({ quantity: 4, couponClaimId: 16 })

    store.clearCheckout(28)
    expect(store.getDraft()).toBeNull()
    expect(storage.getItem(ORDER_CONFIRM_DRAFT_KEY)).toBeNull()
  })

  it('切换商品时不会把上一件商品的优惠券带过去', () => {
    const store = useCheckoutStore()
    store.startCheckout({ productId: 1, quantity: 2 })
    store.updateCheckout(1, { couponClaimId: 99 })
    store.startCheckout({ productId: 2, quantity: 1 })

    expect(store.getDraft(1)).toBeNull()
    expect(store.getDraft(2)).toMatchObject({ quantity: 1, couponClaimId: null })
  })
})
