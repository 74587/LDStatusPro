/**
 * 订单列表滚动/筛选快照 —— 供 Orders.vue 与订单详情页共用。
 *
 * 流程：Orders.vue 在跳转详情前 saveScrollState(source='order-detail')；
 * 返回时 Orders.vue 的 watcher 里 restoreScrollState() 按快照恢复筛选与滚动深度；
 * 详情页 goBack() 通过 readOrderScrollSnapshot() 判断「是否从列表进来」，
 * 决定用 router.back() 还是 push 固定地址（新标签页无快照，自然走 push 兜底）。
 */

export const ORDER_LIST_SCROLL_KEY = 'orders_list_scroll_state'
export const ORDER_LIST_SCROLL_SOURCE = 'order-detail'

// 快照有效期：30 分钟内未消费视为陈旧（防「详情→商品→浏览器后退回详情」等路径误判）
const SNAPSHOT_TTL_MS = 30 * 60 * 1000

export function readOrderScrollSnapshot() {
  try {
    const raw = sessionStorage.getItem(ORDER_LIST_SCROLL_KEY)
    if (!raw) return null
    const snapshot = JSON.parse(raw)
    if (!snapshot || typeof snapshot !== 'object') return null
    if (Number.isFinite(snapshot.ts) && Date.now() - snapshot.ts > SNAPSHOT_TTL_MS) return null
    return snapshot
  } catch {
    return null
  }
}

export function clearOrderScrollState() {
  try {
    sessionStorage.removeItem(ORDER_LIST_SCROLL_KEY)
  } catch {
    // ignore sessionStorage errors
  }
}
