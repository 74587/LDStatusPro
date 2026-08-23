export const REFUND_REASON_OPTIONS = Object.freeze([
  { value: 'not_received_or_unusable', label: '未收到或无法使用' },
  { value: 'not_as_described', label: '与物品描述不符' },
  { value: 'duplicate_or_mistaken_purchase', label: '重复购买或误购' },
  { value: 'seller_agreed', label: '卖家已同意退款' },
  { value: 'other', label: '其他问题' }
])

const REASON_LABELS = Object.freeze(Object.fromEntries(
  REFUND_REASON_OPTIONS.map(option => [option.value, option.label])
))

const STATUS_META = Object.freeze({
  requested: { label: '等待卖家处理', tone: 'warning', description: '退款申请已提交，卖家尚未处理。' },
  negotiating: { label: '协商中', tone: 'info', description: '卖家正在联系你协商处理。' },
  processing: { label: '退款执行中', tone: 'info', description: '系统正在向 LINUX DO Credit 提交全额退款。' },
  failed: { label: '退款执行失败', tone: 'danger', description: '本次自动退款未完成，卖家可以查看原因并重试。' },
  unknown: { label: '退款结果待核对', tone: 'danger', description: '无法确认 Credit 是否已完成退款，为避免重复退回，系统已停止自动重试。' },
  refunded: { label: '已退款', tone: 'success', description: 'LDC 积分已由 LINUX DO Credit 原路退回。' },
  rejected: { label: '卖家已拒绝', tone: 'danger', description: '请先查看卖家说明；协商仍无法解决时，可到 Credit 发起争议。' }
})

export const REFUND_PROGRESS_STEPS = Object.freeze([
  '优先协商',
  '申请退款',
  '卖家处理',
  '处理完成'
])

export function getRefundReasonLabel(code) {
  return REASON_LABELS[String(code || '')] || '其他问题'
}

export function getRefundStatusMeta(status) {
  return STATUS_META[String(status || '')] || {
    label: '售后状态未知',
    tone: 'neutral',
    description: '请刷新页面后重试。'
  }
}

export function getRefundProgressIndex(status, hasRefund = true) {
  if (!hasRefund) return 0
  const value = String(status || '')
  if (value === 'requested') return 1
  if (['negotiating', 'processing', 'failed', 'unknown'].includes(value)) return 2
  if (['refunded', 'rejected'].includes(value)) return 3
  return 0
}

export function validateRefundForm(form = {}) {
  const errors = {}
  const reasonCode = String(form.reasonCode || '').trim()
  const reasonDetail = String(form.reasonDetail || '').trim()
  if (!REFUND_REASON_OPTIONS.some(option => option.value === reasonCode)) {
    errors.reasonCode = '请选择退款原因'
  }
  if (reasonDetail.length < 10) {
    errors.reasonDetail = '请至少填写 10 个字，说明遇到的问题'
  } else if (reasonDetail.length > 500) {
    errors.reasonDetail = '问题说明不能超过 500 个字'
  }
  return errors
}

export function getRefundErrorMessage(result, fallback = '操作失败，请稍后重试') {
  if (typeof result?.error === 'string') return result.error
  if (result?.error?.message) return result.error.message
  if (result?.message) return result.message
  return fallback
}

export function buildLinuxDoMessageUrl(username, orderNo, role = 'seller') {
  const safeUsername = String(username || '').trim().replace(/^@/, '')
  if (!safeUsername) return ''
  const safeOrderNo = String(orderNo || '').trim()
  const params = new URLSearchParams({
    username: safeUsername,
    title: `LD 士多订单 ${safeOrderNo} 售后协商`,
    body: role === 'buyer'
      ? `你好，我想与你协商 LD 士多订单 ${safeOrderNo} 的退款售后问题。`
      : `你好，我正在处理 LD 士多订单 ${safeOrderNo} 的退款申请，想与你进一步协商。`
  })
  return `https://linux.do/new-message?${params.toString()}`
}

export function formatRefundDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
