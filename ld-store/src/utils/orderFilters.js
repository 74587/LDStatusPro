export const REFUND_ORDER_STATUSES = ['refund_pending', 'refunded', 'refund_failed']
export const OTHER_ORDER_FILTERS = [
  { value: 'pending', label: '待支付' },
  { value: 'paying', label: '支付中' },
  { value: 'delivered', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'expired', label: '已过期' },
  { value: 'external_dispute', label: '已转 Credit 处理' },
  { value: 'uploaded', label: '已上传' },
  { value: 'failed', label: '上传失败' }
]
const FILTERS = new Set(['', 'paid', 'cancelled', 'refund', 'other', ...REFUND_ORDER_STATUSES, ...OTHER_ORDER_FILTERS.map(item => item.value)])
export function normalizeOrderStatusFilter(value) {
  const status = String(value || '').trim()
  return FILTERS.has(status) ? status : ''
}
export function toOrderApiStatusFilter(value) {
  const status = normalizeOrderStatusFilter(value)
  if (status === 'refund') return REFUND_ORDER_STATUSES.join(',')
  if (status === 'other') return [...REFUND_ORDER_STATUSES, 'external_dispute'].join(',')
  return status
}
