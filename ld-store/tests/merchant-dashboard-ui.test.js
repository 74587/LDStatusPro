import { describe, expect, it } from 'vitest'
import { buildUserDropdownMenuGroups } from '../src/config/userMenu'
import {
  buildMerchantBrief,
  formatChangeRate,
  sortMerchantTasks
} from '../src/utils/merchantDashboard'
import {
  resolveAppViewKey,
  resolveLegacyPublishTarget,
  resolveOrderArea,
  resolveSellerViewKey
} from '../src/utils/sellerNavigation'
import {
  buildSellerOrderQuery,
  filterAndSortSellerProducts,
  paginateSellerRows,
  resolveSellerStatusTone
} from '../src/utils/sellerTables'

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

describe('卖家后台稳定壳层与列表工具', () => {
  it('所有卖家子路由共用固定壳层 key，查询参数不改变内层 key', () => {
    expect(resolveAppViewKey({ path: '/seller/orders', meta: { layout: 'seller' } })).toBe('seller-layout')
    expect(resolveAppViewKey({ path: '/seller/products', meta: { layout: 'seller' } })).toBe('seller-layout')
    expect(resolveSellerViewKey({ name: 'SellerOrders', fullPath: '/seller/orders?page=1' })).toBe('SellerOrders')
    expect(resolveSellerViewKey({ name: 'SellerOrders', fullPath: '/seller/orders?page=2' })).toBe('SellerOrders')
  })

  it('卖家订单分页参数按商品与求购服务来源正确构造', () => {
    expect(buildSellerOrderQuery({
      page: '3', source: 'product', search: ' LD-10 ', status: 'paid', categoryId: 8, dealOnly: true
    })).toEqual({
      page: 3, pageSize: 20, search: 'LD-10', timeRange: '1m', categoryId: 8, dealOnly: true, status: 'paid'
    })
    expect(buildSellerOrderQuery({ page: 2, source: 'service', status: 'paid', categoryId: 8 })).toEqual({
      page: 2, pageSize: 20, search: '', timeRange: '1m', role: 'provider'
    })
  })

  it('物品搜索、库存筛选、排序与分页保持确定性', () => {
    const products = [
      { id: 1, name: 'Alpha', stock: 3, price: 10, status: 'active', product_type: 'normal', view_count: 2 },
      { id: 2, name: 'Beta', stock: 9, price: 30, status: 'active', product_type: 'normal', view_count: 12 },
      { id: 3, name: 'Gamma', stock: 0, price: 20, status: 'offline', product_type: 'normal', view_count: 4 }
    ]
    const lowStock = filterAndSortSellerProducts(products, { stock: 'low', sort: 'price-desc' })
    expect(lowStock.map(product => product.id)).toEqual([1])
    expect(filterAndSortSellerProducts(products, { search: '2', sort: 'views' }).map(product => product.id)).toEqual([2])
    expect(paginateSellerRows(products, 2, 2)).toMatchObject({ page: 2, total: 3, totalPages: 2, rows: [products[2]] })
  })

  it('状态映射同时包含文字语义所需的稳定色调', () => {
    expect(resolveSellerStatusTone('pending_review')).toBe('warning')
    expect(resolveSellerStatusTone('rejected')).toBe('danger')
    expect(resolveSellerStatusTone('completed')).toBe('success')
    expect(resolveSellerStatusTone('offline')).toBe('neutral')
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
