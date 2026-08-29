import { describe, expect, it } from 'vitest'
import {
  buildSellerCouponClaimsQuery,
  buildSellerCouponQuery,
  getCouponCampaignStateMeta,
  getCouponClaimingAction,
  getCouponClaimStatusMeta
} from '../src/utils/sellerCoupons'
import { formatCouponDate } from '../src/services/shop/couponService'

describe('卖家优惠券管理工具', () => {
  it('区分暂停领取和历史永久停领', () => {
    expect(getCouponCampaignStateMeta('paused')).toEqual({ label: '暂停领取', tone: 'warning' })
    expect(getCouponCampaignStateMeta('closed')).toEqual({ label: '永久停领', tone: 'neutral' })
    expect(getCouponClaimingAction({ state: 'paused', canResume: true })).toBe('resume')
    expect(getCouponClaimingAction({ state: 'active', canPause: true })).toBe('pause')
    expect(getCouponClaimingAction({ state: 'closed', canResume: true })).toBeNull()
  })

  it('只为服务端发送有效且收敛的列表参数', () => {
    expect(buildSellerCouponQuery({ search: '  夏日券 ', state: 'paused', page: 0, pageSize: 100 })).toEqual({
      search: '夏日券', state: 'paused', page: 1, pageSize: 50
    })
    expect(buildSellerCouponQuery({ page: 2 })).toEqual({ page: 2, pageSize: 20 })
  })

  it('领取明细查询支持状态筛选并回退未知状态', () => {
    expect(buildSellerCouponClaimsQuery({ search: ' alice ', status: 'used', page: 3 })).toEqual({
      search: 'alice', status: 'used', page: 3, pageSize: 20
    })
    expect(buildSellerCouponClaimsQuery({ status: 'disabled' })).toMatchObject({ status: 'all' })
    expect(getCouponClaimStatusMeta('expired')).toEqual({ label: '过期未用', tone: 'neutral' })
  })

  it('领取时间按上海时区展示到分钟', () => {
    expect(formatCouponDate('2026-08-29T07:05:30.000Z')).toBe('2026-08-29 15:05')
  })
})
