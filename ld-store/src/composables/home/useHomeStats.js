import { ref } from 'vue'
import { useShopStore } from '@/stores/shop'

const EMPTY_STATS = {
  products: { total: 0, online: 0 },
  orders: { total: 0, today: 0, week: 0 },
  stores: 0
}

export function useHomeStats() {
  const shopStore = useShopStore()
  const stats = ref(structuredClone(EMPTY_STATS))

  async function refreshStats() {
    const data = await shopStore.fetchPublicStats()
    if (data) stats.value = data
    return {
      success: !!data,
      error: data ? '' : (shopStore.consumeLastError?.() || '加载首页统计失败，请稍后重试')
    }
  }

  return { stats, refreshStats }
}
