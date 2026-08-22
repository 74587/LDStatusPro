import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '../src/utils/api'
import {
  normalizeNotificationSummary,
  useNotificationSummaryStore
} from '../src/stores/notificationSummary'

vi.mock('../src/utils/api', () => ({
  api: {
    get: vi.fn()
  }
}))

describe('通知汇总状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('将接口计数规范为非负整数', () => {
    expect(normalizeNotificationSummary({
      totalUnread: '5',
      systemUnread: 2.8,
      buyChatUnread: -1,
      sellerPendingDeliveryCount: 'invalid'
    })).toEqual({
      totalUnread: 5,
      systemUnread: 2,
      buyChatUnread: 0,
      sellerPendingDeliveryCount: 0
    })
  })

  it('强制刷新时只接受最新请求结果，避免旧角标回写', async () => {
    let resolveFirst
    let resolveLatest
    api.get
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveLatest = resolve }))

    const store = useNotificationSummaryStore()
    const firstRequest = store.refresh()
    const latestRequest = store.refresh({ force: true })

    resolveLatest({
      success: true,
      data: { totalUnread: 1, sellerPendingDeliveryCount: 2 }
    })
    await latestRequest
    expect(store.sellerPendingDeliveryCount).toBe(2)

    resolveFirst({
      success: true,
      data: { totalUnread: 9, sellerPendingDeliveryCount: 8 }
    })
    await firstRequest
    expect(store.sellerPendingDeliveryCount).toBe(2)
    expect(store.totalUnread).toBe(1)
  })

  it('普通并发刷新复用同一个请求', async () => {
    let resolveRequest
    api.get.mockReturnValueOnce(new Promise(resolve => { resolveRequest = resolve }))

    const store = useNotificationSummaryStore()
    const firstRequest = store.refresh()
    const sharedRequest = store.refresh()

    expect(api.get).toHaveBeenCalledTimes(1)
    resolveRequest({ success: true, data: { sellerPendingDeliveryCount: 3 } })
    await Promise.all([firstRequest, sharedRequest])
    expect(store.sellerPendingDeliveryCount).toBe(3)
  })

  it('重置后忽略退出登录前的在途响应', async () => {
    let resolveRequest
    api.get.mockReturnValueOnce(new Promise(resolve => { resolveRequest = resolve }))

    const store = useNotificationSummaryStore()
    const request = store.refresh()
    store.reset()
    resolveRequest({ success: true, data: { totalUnread: 4, sellerPendingDeliveryCount: 6 } })
    await request

    expect(store.totalUnread).toBe(0)
    expect(store.sellerPendingDeliveryCount).toBe(0)
  })
})
