import { describe, expect, it } from 'vitest'
import { normalizeOrderStatusFilter, toOrderApiStatusFilter, OTHER_ORDER_FILTERS } from '../src/utils/orderFilters'
import { displayOrderStatus, refundStageText } from '../src/utils/orderPresentation'
describe('订单状态筛选', () => {
  it('退款包含申请中、已退款和退款失败，上传失败独立', () => {
    expect(toOrderApiStatusFilter('refund')).toBe('refund_pending,refunded,refund_failed')
    expect(toOrderApiStatusFilter('failed')).toBe('failed')
  })
  it('旧其他链接保留历史退款及 Credit 集合，具体状态不再被吞并', () => {
    expect(toOrderApiStatusFilter('other')).toBe('refund_pending,refunded,refund_failed,external_dispute')
    expect(normalizeOrderStatusFilter('refunded')).toBe('refunded')
    expect(normalizeOrderStatusFilter('external_dispute')).toBe('external_dispute')
  })
  it('菜单每一分类均可深链接，未知筛选回到全部', () => {
    for (const item of OTHER_ORDER_FILTERS) expect(normalizeOrderStatusFilter(item.value)).toBe(item.value)
    expect(normalizeOrderStatusFilter('unknown')).toBe('')
  })
  it('拒绝后的履约不覆盖退款失败，区分拒绝和执行异常', () => {
    expect(displayOrderStatus({ status: 'delivered', displayStatus: 'refund_failed' })).toBe('refund_failed')
    expect(refundStageText({ refundStatus: 'rejected' })).toBe('申请被拒绝')
    expect(refundStageText({ refundStatus: 'failed' })).toBe('执行异常')
  })
})
