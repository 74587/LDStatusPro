const LIMIT_MODES = new Set(['none', 'per_order', 'per_user'])

function optionalNonNegativeNumber(value) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function optionalDateString(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function getPurchaseLimit(source) {
  const raw = source?.purchaseLimit || source?.purchase_limit || {}
  const sharedCdkEnabled = Boolean(
    source?.sharedCdkEnabled || Number(source?.shared_cdk_enabled || 0) === 1
  )
  const productType = String(source?.productType || source?.product_type || '').toLowerCase()
  const fallbackQuantity = Number(source?.maxPurchaseQuantity ?? source?.max_purchase_quantity ?? 0)
  const fallbackMode = String(source?.purchaseLimitType || source?.purchase_limit_type || '')
  const fallbackPeriodDays = Number(
    source?.purchaseLimitPeriodDays ?? source?.purchase_limit_period_days ?? 0
  )

  let mode = String(raw.mode || fallbackMode || (fallbackQuantity > 0 ? 'per_order' : 'none'))
  let quantity = Number(raw.quantity ?? fallbackQuantity ?? 0)
  let sourceType = String(raw.source || 'seller')
  let periodDays = Number(raw.periodDays ?? raw.period_days ?? fallbackPeriodDays ?? 0)
  if (productType === 'cdk' && sharedCdkEnabled) {
    mode = 'per_user'
    quantity = 1
    sourceType = 'shared_cdk'
    periodDays = 0
  }
  if (!LIMIT_MODES.has(mode)) mode = quantity > 0 ? 'per_order' : 'none'
  if (!Number.isInteger(quantity) || quantity < 1) {
    quantity = 0
    if (mode !== 'none') mode = 'none'
  }
  if (mode !== 'per_user' || !Number.isInteger(periodDays) || periodDays < 0 || periodDays > 365) {
    periodDays = 0
  }

  return {
    mode,
    quantity,
    periodDays,
    source: sourceType,
    purchasedQuantity: optionalNonNegativeNumber(raw.purchasedQuantity ?? raw.purchased_quantity),
    reservedQuantity: optionalNonNegativeNumber(raw.reservedQuantity ?? raw.reserved_quantity),
    remainingQuantity: optionalNonNegativeNumber(raw.remainingQuantity ?? raw.remaining_quantity),
    reached: Boolean(raw.reached),
    bypassed: Boolean(raw.bypassed),
    windowStartedAt: optionalDateString(raw.windowStartedAt ?? raw.window_started_at),
    nextAvailableAt: optionalDateString(raw.nextAvailableAt ?? raw.next_available_at)
  }
}

export function getPurchaseLimitMaximum(limit) {
  if (!limit || limit.mode === 'none') return 0
  if (limit.mode === 'per_user' && Number.isFinite(limit.remainingQuantity)) {
    return Math.max(0, Number(limit.remainingQuantity))
  }
  return Math.max(0, Number(limit.quantity || 0))
}

export function isPurchaseLimitReached(limit) {
  return Boolean(limit?.mode === 'per_user' && !limit?.bypassed && (
    limit.reached || (Number.isFinite(limit.remainingQuantity) && limit.remainingQuantity <= 0)
  ))
}

export function formatPurchaseLimitTitle(limit) {
  if (!limit || limit.mode !== 'per_user') return ''
  const periodDays = Number(limit.periodDays || 0)
  return periodDays > 0
    ? `最近 ${periodDays} 天限购 ${limit.quantity} 件`
    : `累计限购 ${limit.quantity} 件`
}

export function formatPurchaseLimitReleaseTime(value, locale = 'zh-CN') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function formatPurchaseLimitLabel(limit, { loggedIn = false } = {}) {
  if (!limit || limit.mode === 'none') return '不限购买数量'
  if (limit.mode === 'per_order') return `每单最多 ${limit.quantity} 件`
  const title = formatPurchaseLimitTitle(limit)
  if (!loggedIn || !Number.isFinite(limit.remainingQuantity)) {
    return `每位用户${title}${loggedIn ? '' : '，登录后查看余量'}`
  }
  if (isPurchaseLimitReached(limit)) {
    return `已达${title.replace(` ${limit.quantity} 件`, '')}（${limit.quantity}/${limit.quantity}）`
  }
  return `${title} · 还可兑换 ${limit.remainingQuantity} 件`
}
