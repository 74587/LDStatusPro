const TASK_PRIORITY = Object.freeze({ high: 0, medium: 1, low: 2 })

export function formatDashboardNumber(value, maximumFractionDigits = 2) {
  const number = Number(value || 0)
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(Number.isFinite(number) ? number : 0)
}

export function formatChangeRate(value) {
  if (value === null || value === undefined) return '上期无数据'
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return '与上期持平'
  return `${number > 0 ? '+' : ''}${formatDashboardNumber(number, 1)}% 较上期`
}

export function sortMerchantTasks(tasks = []) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = (TASK_PRIORITY[left?.priority] ?? 9) - (TASK_PRIORITY[right?.priority] ?? 9)
    if (priorityDiff !== 0) return priorityDiff
    return Number(right?.count || 0) - Number(left?.count || 0)
  })
}

export function buildMerchantBrief(dashboard) {
  const revenue = Number(dashboard?.today?.revenue ?? dashboard?.kpis?.revenue?.current ?? 0)
  const orders = Number(dashboard?.today?.orders ?? dashboard?.kpis?.orders?.current ?? 0)
  const firstTask = sortMerchantTasks(dashboard?.tasks || [])[0]
  const totalProducts = Number(dashboard?.businessStatus?.products?.total || 0)

  if (totalProducts === 0) {
    return {
      eyebrow: '尚未开张',
      summary: '先完成收款设置并发布第一件物品，审核通过后即可开始经营。',
      action: firstTask?.title || '发布第一件物品'
    }
  }

  if (orders === 0) {
    return {
      eyebrow: '今日尚无成交',
      summary: '今日经营数据保持真实零值。可检查库存、完善物品描述，或使用商家服务增加曝光。',
      action: firstTask?.title || '优化在售物品'
    }
  }

  return {
    eyebrow: `今日完成 ${formatDashboardNumber(orders, 0)} 笔成交`,
    summary: `实收 ${formatDashboardNumber(revenue)} LDC，包含商品销售与求购服务两类经营收入。`,
    action: firstTask?.title || '经营状态良好，继续保持'
  }
}

export function getTaskPriorityLabel(priority) {
  return ({ high: '优先', medium: '建议', low: '关注' })[priority] || '待办'
}
