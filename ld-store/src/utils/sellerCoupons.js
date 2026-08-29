export const COUPON_CAMPAIGN_STATES = Object.freeze([
  { value: '', label: '全部状态' },
  { value: 'active', label: '领取中' },
  { value: 'paused', label: '暂停领取' },
  { value: 'scheduled', label: '待开始' },
  { value: 'sold_out', label: '已领完' },
  { value: 'closed', label: '永久停领' },
  { value: 'expired', label: '已过期' },
  { value: 'disabled', label: '平台停用' }
])

const campaignStateMeta = Object.freeze({
  active: { label: '领取中', tone: 'success' },
  paused: { label: '暂停领取', tone: 'warning' },
  scheduled: { label: '待开始', tone: 'info' },
  sold_out: { label: '已领完', tone: 'neutral' },
  closed: { label: '永久停领', tone: 'neutral' },
  expired: { label: '已过期', tone: 'neutral' },
  disabled: { label: '平台停用', tone: 'danger' }
})

const claimStatusMeta = Object.freeze({
  unused: { label: '未使用', tone: 'success' },
  reserved: { label: '订单占用', tone: 'warning' },
  used: { label: '已使用', tone: 'info' },
  expired: { label: '过期未用', tone: 'neutral' }
})

const eventLabels = Object.freeze({
  created: '创建活动',
  quota_increased: '增加发行量',
  claim_closed: '永久停止领取',
  claim_paused: '暂停领取',
  claim_resumed: '恢复领取',
  claimed: '买家领取',
  reserved: '订单占用',
  released: '订单释放',
  used: '支付核销',
  admin_disabled: '平台停用',
  admin_enabled: '平台恢复',
  late_payment_conflict: '迟到支付冲突'
})

export function getCouponCampaignStateMeta(state) {
  return campaignStateMeta[state] || { label: state || '未知状态', tone: 'neutral' }
}

export function getCouponClaimStatusMeta(status) {
  return claimStatusMeta[status] || { label: status || '未知状态', tone: 'neutral' }
}

export function getCouponEventLabel(action) {
  return eventLabels[action] || action || '活动更新'
}

export function getCouponClaimingAction(campaign = {}) {
  if (campaign.state === 'closed') return null
  if (campaign.canPause && campaign.state === 'active') return 'pause'
  if (campaign.canResume && campaign.state === 'paused') return 'resume'
  return null
}

export function buildSellerCouponQuery({ search = '', state = '', page = 1, pageSize = 20 } = {}) {
  return {
    ...(String(search).trim() ? { search: String(search).trim() } : {}),
    ...(state ? { state } : {}),
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.min(50, Math.max(1, Number(pageSize) || 20))
  }
}

export function buildSellerCouponClaimsQuery({ search = '', status = 'all', page = 1, pageSize = 20 } = {}) {
  return {
    ...(String(search).trim() ? { search: String(search).trim() } : {}),
    status: ['all', 'unused', 'reserved', 'used', 'expired'].includes(status) ? status : 'all',
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.min(50, Math.max(1, Number(pageSize) || 20))
  }
}
