import { describe, expect, it } from 'vitest'
import { URL } from 'node:url'
import {
  buildRefundStages,
  buildLinuxDoMessageUrl,
  getRefundActorLabel,
  getRefundEventMeta,
  getRefundReasonLabel,
  getRefundStatusMeta,
  validateRefundForm
} from '../src/utils/refund'

describe('订单退款买家流程', () => {
  it('校验原因与 10-500 字问题说明', () => {
    expect(validateRefundForm({ reasonCode: '', reasonDetail: '太短' })).toEqual({
      reasonCode: '请选择退款原因',
      reasonDetail: '请至少填写 10 个字，说明遇到的问题'
    })
    expect(validateRefundForm({
      reasonCode: 'not_as_described',
      reasonDetail: '收到内容与物品详情描述不一致，希望协商退款处理。'
    })).toEqual({})
    expect(validateRefundForm({ reasonCode: 'other', reasonDetail: 'a'.repeat(501) }).reasonDetail)
      .toBe('问题说明不能超过 500 个字')
  })

  it('未申请时不展示虚假进度，申请后准确标记当前阶段', () => {
    expect(buildRefundStages('', false)).toEqual([])
    expect(buildRefundStages('requested').map(stage => stage.state)).toEqual(['done', 'current', 'pending', 'pending'])
    expect(buildRefundStages('negotiating')[1]).toMatchObject({ state: 'current', description: '双方正在协商' })
    expect(buildRefundStages('processing')[2]).toMatchObject({ state: 'current', label: '退款执行' })
  })

  it('为成功、拒绝与执行异常提供真实的分支语义', () => {
    const refunded = buildRefundStages('refunded')
    expect(refunded.map(stage => stage.state)).toEqual(['done', 'done', 'done', 'done'])
    expect(refunded[3]).toMatchObject({ label: '已退款', current: true })

    const rejected = buildRefundStages('rejected')
    expect(rejected[2]).toMatchObject({ state: 'skipped', description: '未执行积分退款' })
    expect(rejected[3]).toMatchObject({ state: 'error', label: '已拒绝', current: true })

    expect(buildRefundStages('failed')[2]).toMatchObject({ state: 'error', tone: 'danger' })
    expect(buildRefundStages('unknown')[2]).toMatchObject({ state: 'error', tone: 'warning' })
    expect(getRefundStatusMeta('unknown')).toMatchObject({ tone: 'danger', label: '退款结果待核对' })
  })

  it('为时间线事件提供稳定的语义色调与操作者标签', () => {
    expect(getRefundEventMeta('refund_succeeded')).toMatchObject({ tone: 'success', icon: 'success' })
    expect(getRefundEventMeta('rejected')).toMatchObject({ tone: 'danger', label: '卖家拒绝退款申请' })
    expect(getRefundEventMeta('not_supported')).toMatchObject({ tone: 'neutral', label: '售后状态更新' })
    expect(getRefundActorLabel({ actorType: 'seller', actorName: '@alice' })).toBe('卖家 · @alice')
    expect(getRefundActorLabel({ actorType: 'system' })).toBe('系统')
  })

  it('展示稳定的原因文案并生成安全的 Linux DO 私信地址', () => {
    expect(getRefundReasonLabel('seller_agreed')).toBe('卖家已同意退款')
    const url = new URL(buildLinuxDoMessageUrl('@seller_name', 'LS202608230001', 'buyer'))
    expect(url.origin).toBe('https://linux.do')
    expect(url.pathname).toBe('/new-message')
    expect(url.searchParams.get('username')).toBe('seller_name')
    expect(url.searchParams.get('title')).toContain('LS202608230001')
  })
})
