/* global URL, setTimeout */
import { previewResponse } from '../liquid-tabs-data'
const states = [
  ['paid', 'paid', null], ['paid', 'refund_pending', 'requested'],
  ['delivered', 'refund_failed', 'rejected'], ['refund_pending', 'refund_failed', 'failed'],
  ['refunded', 'refunded', 'refunded'], ['completed', 'completed', null],
  ['cancelled', 'cancelled', null], ['failed', 'failed', null], ['uploaded', 'uploaded', null]
]
const orders = states.map(([status, displayStatus, refundStatus], i) => ({
  id: i + 1, orderNo: `PREVIEW-${i + 1}`, productId: 1, status, displayStatus, refundStatus,
  product: { name: `订单状态演示物品 ${i + 1}`, productType: 'normal' }, productType: 'normal',
  orderType: ['failed', 'uploaded'].includes(status) ? 'image' : 'normal',
  quantity: 1, amount: 28, buyerUsername: 'preview_buyer', sellerUsername: 'preview_seller',
  createdAt: '2026-09-05T07:00:00Z', paidAt: '2026-09-05T07:00:00Z', deliveryType: 'manual',
  orderActions: { canDeliver: displayStatus === 'paid', canConfirm: refundStatus === 'rejected', deliveryDisabledReason: refundStatus ? '退款期间暂停履约' : null, confirmDisabledReason: null }
}))
function rejectWrite() { throw new Error('Writes disabled in isolated preview') }
export const api = {
  async get(input) {
    const url = new URL(input, 'http://preview.invalid')
    if (url.pathname !== '/api/shop/orders') return previewResponse(input)
    await new Promise(resolve => setTimeout(resolve, url.searchParams.get('displayStatus') === 'paid' ? 180 : 30))
    const statuses = url.searchParams.get('displayStatus')?.split(',')
    const filtered = orders.filter(order => (!statuses || statuses.includes(order.displayStatus)) && (url.searchParams.get('role') !== 'seller' || order.orderType !== 'image'))
    return { success: true, data: { orders: filtered, pagination: { page: 1, pageSize: 20, total: filtered.length, totalPages: filtered.length ? 1 : 0 } } }
  }, post: rejectWrite, put: rejectWrite, patch: rejectWrite, delete: rejectWrite
}
