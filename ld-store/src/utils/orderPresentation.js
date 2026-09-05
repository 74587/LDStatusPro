export const ORDER_STATUS_LABELS = {
  pending: '待支付', paying: '支付中', paid: '待发货', delivered: '已发货', completed: '已完成',
  cancelled: '已取消', expired: '已过期', refund_pending: '退款中', refunded: '已退款',
  refund_failed: '退款失败', external_dispute: '已转 Credit 处理', uploaded: '已上传', failed: '上传失败'
}
export function displayOrderStatus(order) { return order?.displayStatus || order?.display_status || order?.status || '' }
export function refundStageText(order) {
  return ({ requested: '待卖家处理', negotiating: '协商中', processing: '执行中', unknown: '结果待核对', rejected: '申请被拒绝', failed: '执行异常' })[order?.refundStatus || order?.refund_status] || ''
}
export function orderStatusLabel(status) { return ORDER_STATUS_LABELS[status] || status || '未知' }

export function orderFulfillmentLabel(order) { return order?.status === 'refund_pending' ? '未发货' : orderStatusLabel(order?.status) }
