import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api'

export function normalizeNotificationSummary(data = {}) {
  const normalizeCount = value => {
    const count = Number(value)
    return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0
  }

  return {
    totalUnread: normalizeCount(data.totalUnread),
    systemUnread: normalizeCount(data.systemUnread),
    buyChatUnread: normalizeCount(data.buyChatUnread),
    sellerPendingDeliveryCount: normalizeCount(data.sellerPendingDeliveryCount),
    sellerRefundPendingCount: normalizeCount(data.sellerRefundPendingCount)
  }
}

export const useNotificationSummaryStore = defineStore('notification-summary', () => {
  const totalUnread = ref(0)
  const systemUnread = ref(0)
  const buyChatUnread = ref(0)
  const sellerPendingDeliveryCount = ref(0)
  const sellerRefundPendingCount = ref(0)
  let activeRequest = null
  let latestRequestId = 0

  function applySummary(data) {
    const summary = normalizeNotificationSummary(data)
    totalUnread.value = summary.totalUnread
    systemUnread.value = summary.systemUnread
    buyChatUnread.value = summary.buyChatUnread
    sellerPendingDeliveryCount.value = summary.sellerPendingDeliveryCount
    sellerRefundPendingCount.value = summary.sellerRefundPendingCount
  }

  async function refresh({ force = false } = {}) {
    if (!force && activeRequest) return activeRequest

    const requestId = ++latestRequestId
    const request = api.get('/api/shop/messages/unread-summary')
      .then(result => {
        if (result.success && requestId === latestRequestId) {
          applySummary(result.data)
        }
        return result
      })
      .catch(() => null)

    activeRequest = request

    try {
      return await request
    } finally {
      if (activeRequest === request) activeRequest = null
    }
  }

  function reset() {
    // 让退出登录前仍在途的请求失效，防止旧用户数据回写。
    latestRequestId += 1
    activeRequest = null
    applySummary()
  }

  return {
    totalUnread,
    systemUnread,
    buyChatUnread,
    sellerPendingDeliveryCount,
    sellerRefundPendingCount,
    refresh,
    reset
  }
})
