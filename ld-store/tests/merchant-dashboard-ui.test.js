import { describe, expect, it } from 'vitest'
import { buildUserDropdownMenuGroups } from '../src/config/userMenu'
import {
  buildMerchantBrief,
  formatChangeRate,
  sortMerchantTasks
} from '../src/utils/merchantDashboard'
import { resolveLegacyPublishTarget, resolveOrderArea } from '../src/utils/sellerNavigation'

describe('买卖功能分区', () => {
  it('右上角菜单严格按买家、系统与卖家入口分组', () => {
    const groups = buildUserDropdownMenuGroups({ messageUnread: 3, sellerPendingDeliveryCount: 7 })
    expect(groups.map(group => group.map(item => item.label))).toEqual([
      ['我的消息', '我的收藏'],
      ['我的订单', '我的优惠券', '我的举报', '我的求购'],
      ['士多图床'],
      ['卖家后台']
    ])
    expect(groups[1][0].badge).toBe('')
    expect(groups[3][0].badge).toBe('7')
  })

  it('旧发布入口按类型分流且保留筛选参数', () => {
    expect(resolveLegacyPublishTarget({ type: 'buy', from: 'home' })).toEqual({
      name: 'BuyRequestPublish', query: { from: 'home' }
    })
    expect(resolveLegacyPublishTarget({ from: 'home' })).toEqual({
      name: 'SellerPublish', query: { from: 'home' }
    })
  })

  it('买家订单不产生卖家身份，卖家订单区分两类来源', () => {
    expect(resolveOrderArea({ tab: 'seller' }, false)).toBe('buyer')
    expect(resolveOrderArea({ tab: 'buy' }, false)).toBe('buy')
    expect(resolveOrderArea({ source: 'product' }, true)).toBe('seller')
    expect(resolveOrderArea({ source: 'service' }, true)).toBe('buy')
  })
})

describe('经营概览展示口径', () => {
  it('正确显示零基数变化率', () => {
    expect(formatChangeRate(null)).toBe('上期无数据')
    expect(formatChangeRate(0)).toBe('与上期持平')
    expect(formatChangeRate(12.34)).toContain('+12.3%')
  })

  it('待办先按优先级、再按数量排序', () => {
    const tasks = sortMerchantTasks([
      { type: 'a', priority: 'low', count: 9 },
      { type: 'b', priority: 'high', count: 1 },
      { type: 'c', priority: 'high', count: 4 }
    ])
    expect(tasks.map(task => task.type)).toEqual(['c', 'b', 'a'])
  })

  it('无成交时给出确定性建议且不伪造数据', () => {
    const brief = buildMerchantBrief({
      kpis: { orders: { current: 0 }, revenue: { current: 0 } },
      lifetime: { orders: 0 },
      tasks: [],
      businessStatus: { products: { total: 2 } }
    })
    expect(brief.eyebrow).toBe('今日尚无成交')
    expect(brief.summary).toContain('真实零值')
  })
})
