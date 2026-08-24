import { describe, expect, it } from 'vitest'
import {
  formatPurchaseLimitLabel,
  formatPurchaseLimitReleaseTime,
  formatPurchaseLimitTitle,
  getPurchaseLimit,
  getPurchaseLimitMaximum,
  isPurchaseLimitReached
} from '../src/utils/purchaseLimit'

describe('买家购买限制展示', () => {
  it('兼容旧每单上限，并读取新的累计额度', () => {
    expect(getPurchaseLimit({ maxPurchaseQuantity: 5 })).toMatchObject({
      mode: 'per_order',
      quantity: 5,
      source: 'seller'
    })

    const limit = getPurchaseLimit({
      purchaseLimit: {
        mode: 'per_user',
        quantity: 3,
        purchasedQuantity: 1,
        reservedQuantity: 1,
        remainingQuantity: 1,
        reached: false
      }
    })
    expect(getPurchaseLimitMaximum(limit)).toBe(1)
    expect(formatPurchaseLimitLabel(limit, { loggedIn: true }))
      .toBe('累计限购 3 件 · 还可兑换 1 件')
  })

  it('对未登录用户隐藏个人余量', () => {
    const limit = getPurchaseLimit({
      purchaseLimit: { mode: 'per_user', quantity: 3, remainingQuantity: 2 }
    })
    expect(formatPurchaseLimitLabel(limit))
      .toBe('每位用户累计限购 3 件，登录后查看余量')
  })

  it('在前端也把共享卡密覆盖为累计一件', () => {
    const limit = getPurchaseLimit({
      productType: 'cdk',
      sharedCdkEnabled: true,
      purchaseLimitType: 'per_order',
      maxPurchaseQuantity: 9
    })
    expect(limit).toMatchObject({ mode: 'per_user', quantity: 1, source: 'shared_cdk' })
  })

  it('达到累计上限时显示明确状态', () => {
    const limit = getPurchaseLimit({
      purchaseLimit: {
        mode: 'per_user',
        quantity: 3,
        purchasedQuantity: 2,
        reservedQuantity: 1,
        remainingQuantity: 0,
        reached: true
      }
    })
    expect(isPurchaseLimitReached(limit)).toBe(true)
    expect(formatPurchaseLimitLabel(limit, { loggedIn: true }))
      .toBe('已达累计限购（3/3）')
  })

  it('展示滚动周期、个人余量和下一次额度释放时间', () => {
    const limit = getPurchaseLimit({
      purchaseLimit: {
        mode: 'per_user',
        quantity: 1,
        periodDays: 7,
        purchasedQuantity: 1,
        reservedQuantity: 0,
        remainingQuantity: 0,
        reached: true,
        nextAvailableAt: '2026-08-25T04:30:00.000Z'
      }
    })

    expect(formatPurchaseLimitTitle(limit)).toBe('最近 7 天限购 1 件')
    expect(formatPurchaseLimitLabel(limit)).toBe('每位用户最近 7 天限购 1 件，登录后查看余量')
    expect(formatPurchaseLimitLabel(limit, { loggedIn: true })).toBe('已达最近 7 天限购（1/1）')
    expect(formatPurchaseLimitReleaseTime(limit.nextAvailableAt)).toContain('8月25日')
  })

  it('共享卡密始终覆盖为永久累计一件', () => {
    const limit = getPurchaseLimit({
      productType: 'cdk',
      sharedCdkEnabled: true,
      purchaseLimit: { mode: 'per_user', quantity: 8, periodDays: 30 }
    })
    expect(limit).toMatchObject({ quantity: 1, periodDays: 0, source: 'shared_cdk' })
  })
})
